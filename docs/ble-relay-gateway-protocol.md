# Prahari BLE Relay Gateway Protocol

The web app can send an offline SOS to a **paired native or hardware relay gateway**. It does not claim that a browser can perform phone-to-phone Bluetooth mesh: Web Bluetooth provides a GATT client, but browsers cannot advertise as GATT peripherals.

## Required gateway GATT service

- Service UUID: `5b0d0e1a-4f4e-4ef4-ae52-9f901d4c0101`
- Writable characteristic UUID: `5b0d0e1a-4f4e-4ef4-ae52-9f901d4c0102`
- The gateway must accept writes with response and reassemble frames before routing the packet.

Each frame is:

```text
0x50 0x52 0x01 <frame-count: uint8> <frame-index: uint8> <up-to-15 bytes UTF-8 JSON>
```

The 15-byte chunk keeps every five-byte-header frame within the baseline 20-byte BLE GATT write payload, so it works without relying on a negotiated larger MTU. The JSON is a version-1 `SOSPacket`. The native gateway must reassemble all frames, validate the packet, cap its size and TTL, deduplicate by `packetId`, keep it in durable local storage, and only then report a Bluetooth write acknowledgement.

## Authority-queue uplink

When the gateway gets Internet access, it increments the packet hop (using its stable gateway node ID), then POSTs the packet to `/api/sos-relay` with:

```text
Content-Type: application/json
X-Prahari-Mesh-Gateway-Key: <PRAHARI_MESH_GATEWAY_KEY>
```

The server validates expiry, packet shape, tourist record, and duplicate incident ID before it records the incident. The gateway key is server-side provisioning material; never embed it in the browser, QR code, or BLE payload.

## Operational truthfulness

The browser shows “accepted by BLE relay” only after GATT writes complete. That is **not** an authority-delivery receipt. The authority dashboard changes only after the gateway’s authenticated Internet uplink succeeds.

## Deployable gateway reference

`tools/ble-gateway` is a Linux/Raspberry Pi reference implementation of this
GATT peripheral. It uses an atomic on-disk queue, validates and deduplicates a
packet before acknowledging its GATT write, increments the gateway hop before
uplink, and retries its authenticated POST while it has Internet access.

```bash
cd tools/ble-gateway
npm install
PRAHARI_GATEWAY_ID=GW-DELHI-01 \
PRAHARI_API_BASE_URL=https://your-prahari-domain.example \
PRAHARI_MESH_GATEWAY_KEY='the-same-secret-configured-on-the-web-server' \
npm start
```

Run it on a supported Linux host with a BLE adapter (for example, a provisioned
Raspberry Pi), not in the browser. Test its hardware-independent queue and
frame logic with `npm test`. The web deployment must have the same
`PRAHARI_MESH_GATEWAY_KEY`; `/api/health` reports this as configured only after
that server-side secret exists.
