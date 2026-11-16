import "server-only";
import { prisma } from "@/lib/prisma";
import { INSTITUTION, IGV, SAVINGS_RATE, TARIFF_DEFAULT } from "@/lib/constants";

export type InstitutionSettings = {
  savingsRate: number;
  students: number;
  classrooms: number;
  tariff: number;
  igv: number;
  institutionName: string;
  district: string;
  academicYear: string;
};

export async function getSettings(): Promise<InstitutionSettings> {
  const rows = await prisma.setting.findMany();
  const map = new Map(rows.map((row) => [row.key, row.value]));
  return {
    savingsRate: Number(map.get("savingsRate") ?? SAVINGS_RATE),
    students: Number(map.get("students") ?? INSTITUTION.students),
    classrooms: Number(map.get("classrooms") ?? INSTITUTION.classrooms),
    tariff: Number(map.get("tariff") ?? TARIFF_DEFAULT),
    igv: Number(map.get("igv") ?? IGV),
    institutionName: map.get("institutionName") ?? INSTITUTION.name,
    district: map.get("district") ?? INSTITUTION.district,
    academicYear: map.get("academicYear") ?? "2026"
  };
}
