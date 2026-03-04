import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Production: serve static files
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../dist')));
  app.get('*', (req, res) => res.sendFile(join(__dirname, '../dist/index.html')));
}

// Socket.io handlers
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('create_room', (data) => { /* Phase 2 */ });
  socket.on('join_room', (data) => { /* Phase 2 */ });
  socket.on('leave_room', (data) => { /* Phase 2 */ });
  socket.on('start_game', (data) => { /* Phase 2 */ });
  socket.on('roll_dice', (data) => { /* Phase 2 */ });
  socket.on('buy_property', (data) => { /* Phase 2 */ });
  socket.on('start_auction', (data) => { /* Phase 2 */ });
  socket.on('auction_bid', (data) => { /* Phase 2 */ });
  socket.on('end_turn', (data) => { /* Phase 2 */ });
  socket.on('build', (data) => { /* Phase 2 */ });
  socket.on('mortgage', (data) => { /* Phase 2 */ });
  socket.on('redeem', (data) => { /* Phase 2 */ });
  socket.on('propose_trade', (data) => { /* Phase 2 */ });
  socket.on('accept_trade', (data) => { /* Phase 2 */ });
  socket.on('decline_trade', (data) => { /* Phase 2 */ });
  socket.on('pay_jail', (data) => { /* Phase 2 */ });
  socket.on('use_card', (data) => { /* Phase 2 */ });
  socket.on('chat_message', (data) => { /* Phase 2 */ });
  socket.on('lend_money', (data) => { /* Phase 2 */ });
  socket.on('skip_bankrupt', (data) => { /* Phase 2 */ });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Kirshas Monopolia server on :${PORT}`));
