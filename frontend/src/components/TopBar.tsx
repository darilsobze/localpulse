type Props = { temp: number; city: string; user: string };

export default function TopBar({ temp, city, user }: Props) {
  const now = new Date();
  const time = now.toLocaleTimeString('en-DE', { hour: '2-digit', minute: '2-digit', hour12: false });
  return (
    <div className="flex items-center justify-between px-6 pt-5 text-[13px] tracking-wide text-stone-800/80">
      <div className="flex items-center gap-2">
        <span className="font-medium">{time}</span>
        <span className="text-stone-700/50">·</span>
        <span>Sun · {temp}°C</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-stone-700/60">Hi, {user}</span>
        <span className="text-stone-700/50">·</span>
        <span>{city}</span>
      </div>
    </div>
  );
}
