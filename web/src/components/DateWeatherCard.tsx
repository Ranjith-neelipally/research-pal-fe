import { Cloud, Droplets, Calendar } from "lucide-react";
import { format } from "date-fns";

interface DateWeatherCardProps {
  selectedDate?: Date;
}

export const DateWeatherCard = ({ selectedDate }: DateWeatherCardProps) => {
  const displayDate = selectedDate || new Date();
  
  // Mock weather data - in production, fetch from weather API
  const weather = {
    temp: 24,
    condition: "Partly Cloudy",
    humidity: 65,
  };

  return (
    <div
      className="w-full glass-card p-5 text-left"
      style={{
        background: "linear-gradient(135deg, hsl(220 25% 15%) 0%, hsl(220 20% 10%) 100%)",
      }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar size={14} />
            <span className="text-xs font-medium uppercase tracking-wider">
              {format(displayDate, "EEEE")}
            </span>
          </div>
          <h2 className="text-3xl font-bold text-foreground">
            {format(displayDate, "MMMM d")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {format(displayDate, "yyyy")}
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <Cloud size={32} className="text-primary" />
            <span className="text-2xl font-semibold">{weather.temp}°</span>
          </div>
          <p className="text-xs text-muted-foreground">{weather.condition}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Droplets size={12} />
              {weather.humidity}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
