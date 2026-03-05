import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

// In production (same origin), use undefined so socket.io auto-detects.
// In dev, connect to the server port explicitly.
const SERVER_URL = import.meta.env.VITE_SERVER_URL || (import.meta.env.PROD ? undefined : 'http://localhost:3001');

export default function useMultiplayer() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const [roomList, setRoomList] = useState([]);
  const [roomState, setRoomState] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [onlineGame, setOnlineGame] = useState(null);
  const [mySlotIndex, setMySlotIndex] = useState(null);
  const [myPlayerIndex, setMyPlayerIndex] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);

  // Connect on mount
  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;
    setSocketReady(true);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('room_list', (list) => setRoomList(list));
    socket.on('room_state', (state) => {
      setRoomState(state);
      if (state?.id) setCurrentRoom(state.id);
    });
    socket.on('room_created', (data) => {
      setCurrentRoom(data.roomId);
      setRoomState(prev => prev || { id: data.roomId });
    });
    socket.on('room_joined', (data) => {
      setMySlotIndex(data.slotIndex);
      if (data.roomId) setCurrentRoom(data.roomId);
    });
    socket.on('game_state', (state) => setOnlineGame(state));
    socket.on('game_started', (data) => {
      const myIdx = data.playerMap?.[socket.id];
      setMyPlayerIndex(myIdx ?? null);
    });
    socket.on('error_msg', (data) => {
      setErrorMsg(data.msg);
      setTimeout(() => setErrorMsg(null), 4000);
    });
    socket.on('chat_message', (msg) => {
      setChatMessages(prev => [...prev, msg]);
    });

    return () => { socket.disconnect(); };
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  const refreshRooms = useCallback(() => emit('get_rooms'), [emit]);

  const createRoom = useCallback((data) => emit('create_room', data), [emit]);

  const joinRoom = useCallback((roomId, playerName) => {
    emit('join_room', { roomId, playerName });
    setCurrentRoom(roomId);
  }, [emit]);

  const leaveRoom = useCallback(() => {
    emit('leave_room');
    setRoomState(null);
    setOnlineGame(null);
    setMySlotIndex(null);
    setMyPlayerIndex(null);
    setChatMessages([]);
    setCurrentRoom(null);
  }, [emit]);

  const toggleReady = useCallback(() => emit('toggle_ready'), [emit]);

  const updateSlot = useCallback((data) => emit('update_slot', data), [emit]);

  const updateConfig = useCallback((data) => emit('update_config', data), [emit]);

  const startGame = useCallback(() => emit('start_game'), [emit]);

  // Game actions
  const rollDice = useCallback(() => emit('roll_dice'), [emit]);
  const buyProperty = useCallback(() => emit('buy_property'), [emit]);
  const startAuction = useCallback(() => emit('start_auction'), [emit]);
  const auctionBid = useCallback((amount) => emit('auction_bid', { amount }), [emit]);
  const endTurn = useCallback(() => emit('end_turn'), [emit]);
  const build = useCallback((cellId) => emit('build', { cellId }), [emit]);
  const mortgage = useCallback((cellId) => emit('mortgage', { cellId }), [emit]);
  const redeem = useCallback((cellId) => emit('redeem', { cellId }), [emit]);
  const payJail = useCallback(() => emit('pay_jail'), [emit]);
  const useCard = useCallback(() => emit('use_card'), [emit]);
  const lendMoney = useCallback((amount) => emit('lend_money', { amount }), [emit]);
  const skipBankrupt = useCallback(() => emit('skip_bankrupt'), [emit]);
  const acceptTrade = useCallback(() => emit('accept_trade'), [emit]);
  const declineTrade = useCallback(() => emit('decline_trade'), [emit]);
  const sendChat = useCallback((text) => emit('chat_message', { text }), [emit]);

  const isHost = roomState?.host === socketRef.current?.id;
  const isMyTurn = onlineGame ? onlineGame.currentPlayer === myPlayerIndex : false;

  return {
    connected,
    socket: socketRef.current,
    socketId: socketRef.current?.id,
    roomList,
    roomState,
    currentRoom,
    onlineGame,
    mySlotIndex,
    myPlayerIndex,
    errorMsg,
    chatMessages,
    isHost,
    isMyTurn,

    refreshRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    updateSlot,
    updateConfig,
    startGame,

    rollDice,
    buyProperty,
    startAuction,
    auctionBid,
    endTurn,
    build,
    mortgage,
    redeem,
    payJail,
    useCard,
    lendMoney,
    skipBankrupt,
    acceptTrade,
    declineTrade,
    sendChat,
  };
}
