# Klinika Boshqaruvi Tizimi

Doctor/Dentist Management System — Next.js + TypeScript + Tailwind CSS + PostgreSQL + Prisma asosida, offline/local network rejimida ishlaydi.

## Texnologiyalar

- **Next.js 16** (App Router, Server Components, Server Actions)
- **TypeScript**
- **Tailwind CSS 4**
- **PostgreSQL 16**
- **Prisma ORM 6**
- **bcryptjs** (parol hashing)
- **jose** (JWT session, HttpOnly cookie)
- **xlsx** (Excel import)

## O'rnatish

### 1. PostgreSQL

PostgreSQL 16 o'rnatilgan: `C:\Program Files\PostgreSQL\16`

Database: `clinic` (UTF8), user: `postgres`, parol: `clinic123`, port: `5432`

PostgreSQL ni ishga tushirish:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\postgres.exe" -D "C:\Program Files\PostgreSQL\16\data" -h localhost
```

### 2. Loyiha

```bash
npm install
npx prisma migrate dev --name init
npx prisma db seed   # boshlang'ich admin: admin / admin123
```

## Ishga tushirish

### Development

```bash
npm run dev
```

Brauzerda: http://localhost:3000

### Production

```bash
npm run build
npm run start
```

## Login

- **Username:** `admin`
- **Parol:** `admin123`

Faqat ADMIN yangi DOCTOR va NURSE userlar yaratishi mumkin.

## Rollar

| Roll | Imkoniyatlar |
|------|-------------|
| ADMIN | Barcha funksiyalar, user management, backup |
| DOCTOR | Bemorlar, tashriflar, hisobotlar |
| NURSE | Bemorlar, tashriflar, hisobotlar |

## Modullar

- **Dashboard** — jami bemorlar, bugungi tashriflar, tushum
- **Bemorlar** — CRUD, qidiruv (ism/telefon)
- **Bemor profili** — tashriflar tarixi
- **Tashriflar** — CRUD, sana oralig'i bo'yicha filtr
- **Hisobotlar** — sana oralig'i, doctorlar bo'yicha
- **Excel Import** — Excel fayldan bemor/tashrif import
- **User Management** (ADMIN) — doctor/hamshira yaratish
- **Backup** (ADMIN) — PostgreSQL backup/restore
- **Sozlamalar** (ADMIN) — parolni o'zgartirish

## Tuzilma

```
src/
  app/
    (dashboard)/     # himoyalangan sahifalar
      dashboard/
      patients/
      visits/
      reports/
      users/
      backup/
      import/
      settings/
    api/             # route handlers
    actions/         # server actions
  components/        # UI komponentlar
  lib/               # prisma, auth, permissions, utils
  types/             # shared types
prisma/
  schema.prisma
  migrations/
  seed.ts
```

## Environment (.env)

```
DATABASE_URL="postgresql://postgres:clinic123@localhost:5432/clinic?schema=public"
SESSION_SECRET="clinic-system-jwt-secret-key-change-me-please-32chars"
PG_BIN_PATH="C:\Program Files\PostgreSQL\16\bin"
PG_HOST="localhost"
PG_PORT="5432"
PG_USER="postgres"
PG_PASSWORD="clinic123"
PG_DATABASE="clinic"
```
