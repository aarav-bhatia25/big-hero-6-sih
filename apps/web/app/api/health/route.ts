import { isChainConfigured, isChainReadable } from '@/lib/blockchain/registry';
import { isIncidentChainConfigured, isIncidentChainReadable } from '@/lib/blockchain/incidentEvidence';
import { notificationProviderStatus } from '@/lib/services/emergencyNotifications';
import { getDatabaseReadiness } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const database = await getDatabaseReadiness();
  return Response.json({
    status: database.ready ? 'ok' : 'degraded', service: 'prahari-web', timestamp: new Date().toISOString(),
    database,
    web3: {
      identity: { readable: isChainReadable, writableByServer: isChainConfigured },
      incidentEvidence: { readable: isIncidentChainReadable, writableByServer: isIncidentChainConfigured },
      walletMode: 'server-custodied',
    },
    providers: {
      notifications: notificationProviderStatus(),
    },
  });
}
