"use client";

interface Props {
  value: string;
  onChange: (month: string) => void;
}

export default function MonthPicker({ value, onChange }: Props) {
  return (
    <input
      type="month"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded px-3 py-2 text-sm"
    />
  );
}
