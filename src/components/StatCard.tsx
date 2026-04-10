import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  delay?: number;
}

export const StatCard = ({ icon: Icon, value, label, delay = 0 }: StatCardProps) => (
  <div
    className="glass rounded-2xl p-6 border border-border shadow-xl shadow-black/5 card-hover animate-slide-up"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-center space-x-4">
      <div className="w-12 h-12 bg-f1-red/20 rounded-xl flex items-center justify-center">
        <Icon className="text-f1-red" size={24} />
      </div>
      <div className="text-left">
        <div className="text-2xl font-bold text-primary font-orbitron">{value}</div>
        <div className="text-secondary text-sm font-medium">{label}</div>
      </div>
    </div>
  </div>
);

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
}

export const AnimatedCounter = ({ value, suffix = '' }: AnimatedCounterProps) => {
  return (
    <span className="tabular-nums">
      {value.toLocaleString()}{suffix}
    </span>
  );
};
