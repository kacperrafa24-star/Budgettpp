import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Podaj poprawny email i hasło (min. 6 znaków)" },
        { status: 400 }
      );
    }

    // Sprawdzamy, czy użytkownik już istnieje
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Konto z tym adresem e-mail już istnieje" },
        { status: 400 }
      );
    }

    // Szyfrujemy hasło (sól 10 rund)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tworzymy użytkownika
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    return NextResponse.json({ message: "Konto zostało utworzone!" }, { status: 201 });
  } catch (error) {
    console.error("REGISTER_ERROR", error);
    return NextResponse.json({ error: "Wewnętrzny błąd serwera" }, { status: 500 });
  }
}