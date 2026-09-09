import { LoaderCircle } from 'lucide-react';

export default function Loading() {
  return (
    <div role="status" className="empty" aria-live="polite">
      <LoaderCircle className="loading-spinner" size={24} />
      Memuat halaman…
    </div>
  );
}
