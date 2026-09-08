'use client';
import { Inbox } from 'lucide-react';

interface EmptyProps {
  text?: string;
}

export default function Empty({ text = 'Tidak ada tiket yang cocok.' }: EmptyProps) {
  return (
    <div className="empty">
      <Inbox size={30} />
      <strong>{text}</strong>
      <span>Coba ubah pencarian atau filter yang digunakan.</span>
    </div>
  );
}
