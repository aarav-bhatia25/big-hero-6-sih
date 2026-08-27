import { identityRegistryChainId, identityRegistryNetwork, isChainConfigured, isChainReadable } from '@/lib/blockchain/registry';
import { incidentRegistryChainId, incidentRegistryNetwork, isIncidentChainConfigured, isIncidentChainReadable } from '@/lib/blockchain/incidentEvidence';
import { notificationProviderStatus } from '@/lib/services/emergencyNotifications';
import { isEmergencyProfileAiConfigured } from '@/lib/services/emergencyClothingProfile';
import { indiaHazardProviderStatus } from '@/lib/services/indiaHazards';
import { sarvamMultilingualProviderStatus } from '@/lib/services/multilingualCommunication';
import { getDatabaseReadiness } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const database = await getDatabaseReadiness();
  return Response.json({
    status: database.ready ? 'ok' : 'degraded', service: 'prahari-web', timestamp: new Date().toISOString(),
    database,
    web3: {
      identity: { readable: isChainReadable, writableByServer: isChainConfigured, network: identityRegistryNetwork, expectedChainId: identityRegistryChainId },
      incidentEvidence: { readable: isIncidentChainReadable, writableByServer: isIncidentChainConfigured, network: incidentRegistryNetwork, expectedChainId: incidentRegistryChainId },
      walletMode: 'server-custodied',
    },
    providers: {
      notifications: notificationProviderStatus(),
      emergencyIdentificationProfile: { openAiConfigured: isEmergencyProfileAiConfigured() },
      indiaHazards: indiaHazardProviderStatus(),
      multilingualCommunication: sarvamMultilingualProviderStatus(),
      offlineBleRelay: {
        gatewayUplinkConfigured: Boolean(process.env.PRAHARI_MESH_GATEWAY_KEY),
        browserRole: 'GATT client only; requires a separately provisioned native or hardware gateway',
      },
    },
  });
}
