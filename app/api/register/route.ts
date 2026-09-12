import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma"; // 🔴 IMPORTUJEMY NASZEGO SKONFIGUROWANEGO KLIENTA

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: "Brakuje maila lub hasła!" }, { status: 400 });
    }

    // Sprawdzamy, czy użytkownik z tym adresem e-mail już istnieje
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ message: "Ten adres e-mail jest już zajęty." }, { status: 400 });
    }

    // Szyfrujemy hasło przed zapisem do bazy
    const hashedPassword = await bcrypt.hash(password, 10);

    // Zapisujemy nowego użytkownika
    // Domyślnie otrzyma rolę USER i plan FREE (zgodnie ze schematem bazy)
    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hashedPassword,
      },
    });

    return NextResponse.json({ message: "Konto utworzone!", userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("Błąd rejestracji:", error);
    return NextResponse.json({ message: "Wystąpił błąd serwera." }, { status: 500 });
  }
}