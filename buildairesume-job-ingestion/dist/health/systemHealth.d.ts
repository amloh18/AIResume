export interface SystemHealthReport {
    status: 'healthy' | 'degraded' | 'failing';
    timestamp: string;
    uptimeSeconds: number;
    service: string;
    mongodb: {
        connected: boolean;
        database: string;
        pingMs: number;
    };
    scheduler: {
        running: boolean;
    };
    sources: {
        total: number;
        healthy: number;
        degraded: number;
        circuitOpen: number;
        breakdown: Record<string, any>;
    };
}
export declare function getSystemHealth(): Promise<SystemHealthReport>;
