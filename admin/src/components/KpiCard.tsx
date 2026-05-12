import { Card, CardContent } from '@/components/ui/card';

interface KpiCardProps {
  label: string;
  value: number | string;
}

export default function KpiCard({ label, value }: KpiCardProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">{String(value)}</p>
      </CardContent>
    </Card>
  );
}
