import { setInterval, clearInterval } from 'worker-timers';
let ws: WebSocket;
let heartbeatInterval: number;

export function connectWebSocket() {
  ws = new WebSocket('ws://localhost:52381');

  ws.onopen = () => {
    console.log('WebSocket connected');
    startHeartbeat();
  };

  ws.onmessage = (event) => {
    console.log('Received:', event.data);
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
    clearInterval(heartbeatInterval);
    // setTimeout(connectWebSocket, 3000); // 3秒后重连
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

function startHeartbeat() {
  heartbeatInterval = setInterval(() => {
    const heartbeat = {
      type: 'heartbeat',
      timestamp: new Date().toISOString(),
    };
    ws.send(JSON.stringify(heartbeat));
    console.log('Sent heartbeat');
  }, 5000); // 每5秒发送一次心跳
}

export default connectWebSocket;
