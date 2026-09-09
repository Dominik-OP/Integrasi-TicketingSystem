'use client';
import { initials } from '@/lib/domain';

interface AvatarProps {
  name: string;
  small?: boolean;
}

export default function Avatar({ name, small = false }: AvatarProps) {
  return (
    <span className={`avatar ${small ? 'small' : ''} color-${name.length % 4}`}>
      {initials(name)}
    </span>
  );
}
