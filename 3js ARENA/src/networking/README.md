# Networking Integration (Placeholder)

This folder contains placeholder stubs for P2P multiplayer networking.

## Plan

- **Tech**: PeerJS or NetplayJS for WebRTC-based P2P connection
- **Architecture**: One player hosts, the other joins via room code
- **Data**: Each player sends their `CVInputData` to the opponent every frame
- **Sync**: Input delay / rollback netcode for responsive gameplay

## To Integrate

1. Install: `npm install peerjs` or `npm install netplayjs`
2. Fill in `NetworkProvider.tsx` with connection setup and room management
3. Fill in `useNetworkState.ts` to send/receive opponent CV data
4. Wire into `Player.tsx` — Player 2 reads from `opponentInput` instead of local keyboard
