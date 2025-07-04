export class MarketTimezoneService {
  private readonly MARKET_SCHEDULE = {
    preMarket: { start: '04:00', end: '09:30' },
    regular: { start: '09:30', end: '16:00' },
    afterHours: { start: '16:00', end: '20:00' }
  };

  getStatus() {
    const now = new Date();
    const nyTime = this.toNYTime(now);
    const ptTime = this.toPTTime(now);
    
    return {
      isOpen: this.isMarketOpen(nyTime),
      isAfterHours: this.isAfterHours(nyTime),
      isPreMarket: this.isPreMarket(nyTime),
      isWeekend: this.isWeekend(nyTime),
      updateInterval: this.getUpdateInterval(nyTime),
      times: {
        ny: {
          current: this.formatTime(nyTime),
          timezone: this.isDST(nyTime) ? 'EDT' : 'EST',
          offset: this.isDST(nyTime) ? '-04:00' : '-05:00'
        },
        portugal: {
          current: this.formatTime(ptTime),
          timezone: this.isDST(ptTime) ? 'WEST' : 'WET',
          offset: this.isDST(ptTime) ? '+01:00' : '+00:00'
        }
      },
      schedule: this.getTodaySchedule(nyTime, ptTime)
    };
  }

  private toNYTime(date: Date): Date {
    return new Date(date.toLocaleString("en-US", { 
      timeZone: "America/New_York" 
    }));
  }

  private toPTTime(date: Date): Date {
    return new Date(date.toLocaleString("en-US", { 
      timeZone: "Europe/Lisbon" 
    }));
  }

  private isMarketOpen(nyTime: Date): boolean {
    if (this.isWeekend(nyTime)) return false;
    
    const hours = nyTime.getHours();
    const minutes = nyTime.getMinutes();
    const currentMinutes = hours * 60 + minutes;
    
    const openMinutes = 9 * 60 + 30; // 9:30 AM
    const closeMinutes = 16 * 60;     // 4:00 PM
    
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }

  private isAfterHours(nyTime: Date): boolean {
    if (this.isWeekend(nyTime)) return false;
    
    const hours = nyTime.getHours();
    const minutes = nyTime.getMinutes();
    const currentMinutes = hours * 60 + minutes;
    
    const afterStart = 16 * 60;  // 4:00 PM
    const afterEnd = 20 * 60;    // 8:00 PM
    
    return currentMinutes >= afterStart && currentMinutes < afterEnd;
  }

  private isPreMarket(nyTime: Date): boolean {
    if (this.isWeekend(nyTime)) return false;
    
    const hours = nyTime.getHours();
    const minutes = nyTime.getMinutes();
    const currentMinutes = hours * 60 + minutes;
    
    const preStart = 4 * 60;      // 4:00 AM
    const preEnd = 9 * 60 + 30;   // 9:30 AM
    
    return currentMinutes >= preStart && currentMinutes < preEnd;
  }

  private isWeekend(nyTime: Date): boolean {
    const day = nyTime.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  }

  private getUpdateInterval(nyTime: Date): number {
    if (this.isMarketOpen(nyTime)) return 60 * 1000;        // 1 minuto
    if (this.isAfterHours(nyTime)) return 5 * 60 * 1000;   // 5 minutos
    return 15 * 60 * 1000;                                  // 15 minutos
  }

  private isDST(date: Date): boolean {
    const jan = new Date(date.getFullYear(), 0, 1);
    const jul = new Date(date.getFullYear(), 6, 1);
    return date.getTimezoneOffset() < Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('pt-PT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  private getTodaySchedule(nyTime: Date, ptTime: Date) {
    const schedule: any = {};
    
    // Calcular diferença de horas entre NY e PT
    const nyHours = nyTime.getHours();
    const ptHours = ptTime.getHours();
    let hourDiff = ptHours - nyHours;
    if (hourDiff < 0) hourDiff += 24; // Ajustar para diferença positiva

    for (const [period, times] of Object.entries(this.MARKET_SCHEDULE)) {
      const [startHour, startMin] = times.start.split(':').map(Number);
      const [endHour, endMin] = times.end.split(':').map(Number);
      
      // Converter para horário de Portugal
      const ptStartHour = (startHour + hourDiff) % 24;
      const ptEndHour = (endHour + hourDiff) % 24;
      
      schedule[period] = {
        ny: `${times.start} - ${times.end} ${this.isDST(nyTime) ? 'EDT' : 'EST'}`,
        portugal: `${String(ptStartHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')} - ${String(ptEndHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')} ${this.isDST(ptTime) ? 'WEST' : 'WET'}`
      };
    }
    
    return schedule;
  }
}

// Singleton instance
export const marketTimezone = new MarketTimezoneService();