import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Topbar } from "@/components/Topbar";
import { PatientActions } from "@/components/PatientActions";
import { VisitActions } from "@/components/VisitActions";
import { Pagination, PAGE_SIZE } from "@/components/Pagination";
import { formatDate, formatMoney, formatPaymentType, toInputDate, calcAge } from "@/lib/utils";

export default async function PatientProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) notFound();

  const { id } = await params;
  const patientId = Number(id);
  if (!patientId) notFound();

  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
  });

  if (!patient) notFound();

  const isAdmin = user.role === "ADMIN";
  const visitScope = isAdmin ? {} : { doctor_id: user.id };

  if (!isAdmin) {
    const ownVisits = await prisma.visit.count({
      where: { patient_id: patientId, doctor_id: user.id },
    });
    if (ownVisits === 0) notFound();
  }

  const [visits, visitsTotal, paymentAgg] = await Promise.all([
    prisma.visit.findMany({
      where: { patient_id: patientId, ...visitScope },
      orderBy: { id: "asc" },
      include: { doctor: { select: { id: true, full_name: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.visit.count({ where: { patient_id: patientId, ...visitScope } }),
    prisma.visit.aggregate({
      where: { patient_id: patientId, is_active: true, ...visitScope },
      _sum: { payment_amount: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(visitsTotal / PAGE_SIZE));

  const canEditPatient = hasPermission(user.role, "patients:edit");
  const canDeletePatient = hasPermission(user.role, "patients:delete");
  const canCreateVisit = hasPermission(user.role, "visits:create");
  const canEditVisit = hasPermission(user.role, "visits:edit");
  const canDeleteVisit = hasPermission(user.role, "visits:delete");

  const doctors = isAdmin
    ? await prisma.user.findMany({
        where: { role: "DOCTOR", is_active: true },
        select: { id: true, full_name: true },
        orderBy: { full_name: "asc" },
      })
    : [];

  const totalPayment = Number(paymentAgg._sum.payment_amount ?? 0);

  return (
    <>
      <Topbar title="Bemor profili" />
      <main className="flex-1 p-6">
        <div className="mb-4">
          <Link
            href="/patients"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Bemorlarga qaytish
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                {patient.full_name}
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    patient.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {patient.is_active ? "Aktiv" : "Deaktiv"}
                </span>
              </h2>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                <div>
                  <span className="text-slate-400">Tug'ilgan sana: </span>
                  {formatDate(patient.birth_date)}
                  {patient.birth_date && (
                    <span className="text-slate-400">
                      {" "}
                      ({calcAge(patient.birth_date)} yosh)
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400">Telefon: </span>
                  {patient.phone ?? "-"}
                </div>
                <div>
                  <span className="text-slate-400">Jami to'lov: </span>
                  <span className="font-medium text-slate-800">
                    {formatMoney(totalPayment)}
                  </span>
                </div>
              </div>
            </div>
            <PatientActions
              mode="row"
              patient={{
                id: patient.id,
                full_name: patient.full_name,
                birth_date: patient.birth_date
                  ? toInputDate(patient.birth_date)
                  : "",
                phone: patient.phone ?? "",
                is_active: patient.is_active,
              }}
              canEdit={canEditPatient}
              canDelete={canDeletePatient}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-slate-800">
            Tashriflar ({visitsTotal})
          </h3>
          {canCreateVisit && (
            <VisitActions
              mode="create"
              doctors={doctors}
              fixedPatientId={patient.id}
              currentDoctorId={user.id}
              isAdmin={isAdmin}
            />
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600 border-b border-slate-200">
                <th className="px-4 py-3 font-medium">Sana</th>
                <th className="px-4 py-3 font-medium">Doctor</th>
                <th className="px-4 py-3 font-medium">Tashxis</th>
                <th className="px-4 py-3 font-medium">Bajarilgan ishlar</th>
                <th className="px-4 py-3 font-medium">To'lov turi</th>
                <th className="px-4 py-3 font-medium text-right">To'lov</th>
                <th className="px-4 py-3 font-medium">Qo'shimcha</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {visits.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    Tashriflar yo'q.
                  </td>
                </tr>
              ) : (
                visits.map((v) => (
                  <tr
                    key={v.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 align-top ${
                      v.is_active ? "" : "opacity-60"
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {formatDate(v.visit_date)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {v.doctor.full_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs">
                      {v.diagnosis ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs">
                      {v.performed_work ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatPaymentType(v.payment_type)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap">
                      {formatMoney(Number(v.payment_amount ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs">
                      {v.additional_info ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          v.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {v.is_active ? "Aktiv" : "Deaktiv"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <VisitActions
                        mode="row"
                        visit={{
                          id: v.id,
                          patient_id: v.patient_id,
                          doctor_id: v.doctor_id,
                          visit_date: toInputDate(v.visit_date),
                          diagnosis: v.diagnosis ?? "",
                          performed_work: v.performed_work ?? "",
                          payment_amount:
                            v.payment_amount != null
                              ? String(v.payment_amount)
                              : "",
                          payment_type: v.payment_type ?? "",
                          additional_info: v.additional_info ?? "",
                          is_active: v.is_active,
                        }}
                        doctors={doctors}
                        fixedPatientId={v.patient_id}
                        currentDoctorId={user.id}
                        isAdmin={isAdmin}
                        canEdit={canEditVisit}
                        canDelete={canDeleteVisit}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={visitsTotal}
            params={{}}
            path={`/patients/${patientId}`}
          />
        </div>
      </main>
    </>
  );
}
