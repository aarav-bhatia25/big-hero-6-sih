# Optional BLE relay setup

## Do you need this?

**No, not for normal use.** A traveller with Wi-Fi or mobile data sends an SOS directly to the Prahari authority queue. The local retry queue also works without BLE when the device later reconnects.

Only use this guide for a controlled demonstration of a no-internet, cross-device handoff through a separately provisioned Linux/Raspberry Pi gateway.

## What BLE does and does not do

- The browser is a GATT client only; it cannot advertise a peer-to-peer phone mesh.
- A paired gateway can durably accept an SOS packet while the traveller browser has no internet.
- The gateway later uploads the packet to `/api/sos-relay` when **the gateway** has internet access.
- A successful Bluetooth write is not an authority, police, 112, or emergency-service receipt.
- The traveller must explicitly open **Optional offline BLE relay** and choose **Set up relay**. Prahari never asks for Bluetooth to use Wi-Fi delivery.

## Gateway prerequisites

- A supported Linux/Raspberry Pi host with a BLE adapter
- The `tools/ble-gateway` reference project
- A stable gateway identifier
- A shared server-only gateway key
- A reachable HTTPS Prahari API URL

## Run the reference gateway

```bash
cd tools/ble-gateway
npm install
PRAHARI_GATEWAY_ID=GW-DEMO-01 \
PRAHARI_API_BASE_URL=https://your-prahari-domain.example \
PRAHARI_MESH_GATEWAY_KEY='same-secret-configured-on-the-api' \
npm start
```

Set that same `PRAHARI_MESH_GATEWAY_KEY` in the web/API deployment only. Do not place it in client code, a QR code, advertisements, or the BLE payload.

## Demonstration checklist

1. Verify normal SOS first with Wi-Fi on; it should use `INTERNET` without pairing anything.
2. For the optional demo, take the traveller browser offline and open the optional relay section.
3. Pair the displayed Prahari gateway through the browser chooser.
4. Send a test SOS. The UI may say the relay accepted it; this is still pending authority delivery.
5. Restore the gateway’s internet access and confirm the authority queue receives the incident.

See [the wire protocol](ble-relay-gateway-protocol.md) for service UUIDs, framing, TTL, deduplication, and gateway implementation requirements.
