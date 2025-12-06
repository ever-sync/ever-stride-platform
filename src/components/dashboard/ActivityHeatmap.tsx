import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HeatmapData {
  hour: number;
  day: number;
  value: number;
}

interface ActivityHeatmapProps {
  data: HeatmapData[];
  loading?: boolean;
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function ActivityHeatmap({ data, loading }: ActivityHeatmapProps) {
  const getIntensity = (value: number, maxValue: number) => {
    if (value === 0) return "bg-muted";
    const intensity = value / maxValue;
    if (intensity < 0.25) return "bg-primary/20";
    if (intensity < 0.5) return "bg-primary/40";
    if (intensity < 0.75) return "bg-primary/60";
    return "bg-primary/80";
  };

  const maxValue = Math.max(...data.map(d => d.value), 1);

  const getValueForCell = (day: number, hour: number) => {
    return data.find(d => d.day === day && d.hour === hour)?.value || 0;
  };

  if (loading) {
    return (
      <Card className="col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Mapa de Atividade</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-[180px] flex items-center justify-center">
            <div className="animate-pulse bg-muted rounded w-full h-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Mapa de Atividade (Últimos 7 dias)</CardTitle>
        <Activity className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Hours header */}
            <div className="flex gap-1 mb-1 ml-10">
              {HOURS.filter((_, i) => i % 3 === 0).map(hour => (
                <div key={hour} className="text-xs text-muted-foreground w-[36px] text-center">
                  {hour}h
                </div>
              ))}
            </div>
            
            {/* Grid */}
            <TooltipProvider>
              {DAYS.map((day, dayIndex) => (
                <div key={day} className="flex items-center gap-1 mb-1">
                  <span className="text-xs text-muted-foreground w-8">{day}</span>
                  <div className="flex gap-0.5">
                    {HOURS.map(hour => {
                      const value = getValueForCell(dayIndex, hour);
                      return (
                        <Tooltip key={`${dayIndex}-${hour}`}>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-3 h-3 rounded-sm cursor-pointer transition-colors ${getIntensity(value, maxValue)}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              {day} às {hour}h: {value} mensagens
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              ))}
            </TooltipProvider>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-4 ml-10">
              <span className="text-xs text-muted-foreground">Menos</span>
              <div className="flex gap-0.5">
                <div className="w-3 h-3 rounded-sm bg-muted" />
                <div className="w-3 h-3 rounded-sm bg-primary/20" />
                <div className="w-3 h-3 rounded-sm bg-primary/40" />
                <div className="w-3 h-3 rounded-sm bg-primary/60" />
                <div className="w-3 h-3 rounded-sm bg-primary/80" />
              </div>
              <span className="text-xs text-muted-foreground">Mais</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
