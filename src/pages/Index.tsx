import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface Position {
  x: number;
  y: number;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  health: number;
  type: 'goblin' | 'orc' | 'dragon';
}

interface Item {
  id: number;
  x: number;
  y: number;
  type: 'coin' | 'heart' | 'sword' | 'shield';
}

interface GameState {
  player: Position & { health: number; maxHealth: number };
  enemies: Enemy[];
  items: Item[];
  score: number;
  level: number;
  gameStatus: 'playing' | 'paused' | 'gameOver' | 'victory';
  inventory: { [key: string]: number };
}

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const CELL_SIZE = 40;

export default function AdventureGame() {
  const [gameState, setGameState] = useState<GameState>({
    player: { x: 100, y: 100, health: 100, maxHealth: 100 },
    enemies: [],
    items: [],
    score: 0,
    level: 1,
    gameStatus: 'playing',
    inventory: { coin: 0, heart: 0, sword: 0, shield: 0 }
  });

  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});

  // Initialize level
  const initializeLevel = useCallback((level: number) => {
    const enemies: Enemy[] = [];
    const items: Item[] = [];

    // Generate enemies based on level
    const enemyCount = Math.min(3 + level, 8);
    for (let i = 0; i < enemyCount; i++) {
      enemies.push({
        id: i,
        x: Math.random() * (GAME_WIDTH - 60) + 30,
        y: Math.random() * (GAME_HEIGHT - 60) + 30,
        health: 50 + level * 10,
        type: level <= 2 ? 'goblin' : level <= 4 ? 'orc' : 'dragon'
      });
    }

    // Generate items
    const itemCount = 5 + level;
    for (let i = 0; i < itemCount; i++) {
      const itemTypes: Item['type'][] = ['coin', 'heart', 'sword', 'shield'];
      items.push({
        id: i,
        x: Math.random() * (GAME_WIDTH - 40) + 20,
        y: Math.random() * (GAME_HEIGHT - 40) + 20,
        type: itemTypes[Math.floor(Math.random() * itemTypes.length)]
      });
    }

    setGameState(prev => ({
      ...prev,
      enemies,
      items,
      level,
      player: { ...prev.player, x: 100, y: 100 }
    }));
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [e.key.toLowerCase()]: true }));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [e.key.toLowerCase()]: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState.gameStatus !== 'playing') return;

    const gameLoop = setInterval(() => {
      setGameState(prev => {
        const newState = { ...prev };
        const speed = 5;

        // Move player
        if (keys['w'] || keys['arrowup']) {
          newState.player.y = Math.max(0, newState.player.y - speed);
        }
        if (keys['s'] || keys['arrowdown']) {
          newState.player.y = Math.min(GAME_HEIGHT - 40, newState.player.y + speed);
        }
        if (keys['a'] || keys['arrowleft']) {
          newState.player.x = Math.max(0, newState.player.x - speed);
        }
        if (keys['d'] || keys['arrowright']) {
          newState.player.x = Math.min(GAME_WIDTH - 40, newState.player.x + speed);
        }

        // Move enemies towards player
        newState.enemies = newState.enemies.map(enemy => {
          const dx = newState.player.x - enemy.x;
          const dy = newState.player.y - enemy.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            const moveSpeed = enemy.type === 'goblin' ? 1 : enemy.type === 'orc' ? 1.5 : 2;
            enemy.x += (dx / distance) * moveSpeed;
            enemy.y += (dy / distance) * moveSpeed;
          }
          
          return enemy;
        });

        // Check collisions with items
        newState.items = newState.items.filter(item => {
          const dx = newState.player.x - item.x;
          const dy = newState.player.y - item.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 30) {
            // Collect item
            newState.inventory[item.type]++;
            newState.score += item.type === 'coin' ? 10 : 20;
            
            if (item.type === 'heart' && newState.player.health < newState.player.maxHealth) {
              newState.player.health = Math.min(newState.player.maxHealth, newState.player.health + 20);
            }
            
            return false; // Remove item
          }
          return true;
        });

        // Check collisions with enemies
        newState.enemies.forEach(enemy => {
          const dx = newState.player.x - enemy.x;
          const dy = newState.player.y - enemy.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 35) {
            // Player takes damage
            const damage = enemy.type === 'goblin' ? 5 : enemy.type === 'orc' ? 8 : 12;
            const protection = newState.inventory.shield * 2;
            newState.player.health = Math.max(0, newState.player.health - Math.max(1, damage - protection));
          }
        });

        // Attack enemies with space bar
        if (keys[' '] || keys['spacebar']) {
          const attackRange = 50 + newState.inventory.sword * 10;
          newState.enemies = newState.enemies.filter(enemy => {
            const dx = newState.player.x - enemy.x;
            const dy = newState.player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < attackRange) {
              const damage = 25 + newState.inventory.sword * 10;
              enemy.health -= damage;
              newState.score += 5;
              
              if (enemy.health <= 0) {
                newState.score += enemy.type === 'goblin' ? 50 : enemy.type === 'orc' ? 100 : 200;
                return false; // Remove enemy
              }
            }
            return true;
          });
        }

        // Check win condition
        if (newState.enemies.length === 0) {
          if (newState.level < 5) {
            // Next level
            setTimeout(() => initializeLevel(newState.level + 1), 1000);
          } else {
            newState.gameStatus = 'victory';
          }
        }

        // Check game over
        if (newState.player.health <= 0) {
          newState.gameStatus = 'gameOver';
        }

        return newState;
      });
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(gameLoop);
  }, [keys, gameState.gameStatus, initializeLevel]);

  // Initialize first level
  useEffect(() => {
    initializeLevel(1);
  }, [initializeLevel]);

  const resetGame = () => {
    setGameState({
      player: { x: 100, y: 100, health: 100, maxHealth: 100 },
      enemies: [],
      items: [],
      score: 0,
      level: 1,
      gameStatus: 'playing',
      inventory: { coin: 0, heart: 0, sword: 0, shield: 0 }
    });
    initializeLevel(1);
  };

  const getEnemyEmoji = (type: Enemy['type']) => {
    switch (type) {
      case 'goblin': return '👹';
      case 'orc': return '👺';
      case 'dragon': return '🐉';
      default: return '👹';
    }
  };

  const getItemEmoji = (type: Item['type']) => {
    switch (type) {
      case 'coin': return '🪙';
      case 'heart': return '❤️';
      case 'sword': return '⚔️';
      case 'shield': return '🛡️';
      default: return '🪙';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">🏰 Epic Adventure Quest</h1>
          <p className="text-gray-300">Use WASD or Arrow keys to move, SPACE to attack!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Game Stats */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4 bg-slate-800 border-slate-700">
              <h3 className="text-white font-bold mb-3">Player Stats</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm text-gray-300 mb-1">
                    <span>Health</span>
                    <span>{gameState.player.health}/{gameState.player.maxHealth}</span>
                  </div>
                  <Progress 
                    value={(gameState.player.health / gameState.player.maxHealth) * 100} 
                    className="h-2"
                  />
                </div>
                <div className="flex justify-between text-white">
                  <span>Score:</span>
                  <Badge variant="secondary">{gameState.score}</Badge>
                </div>
                <div className="flex justify-between text-white">
                  <span>Level:</span>
                  <Badge variant="outline">{gameState.level}</Badge>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-slate-800 border-slate-700">
              <h3 className="text-white font-bold mb-3">Inventory</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-300">🪙 Coins: {gameState.inventory.coin}</div>
                <div className="text-gray-300">❤️ Hearts: {gameState.inventory.heart}</div>
                <div className="text-gray-300">⚔️ Swords: {gameState.inventory.sword}</div>
                <div className="text-gray-300">🛡️ Shields: {gameState.inventory.shield}</div>
              </div>
            </Card>

            <Card className="p-4 bg-slate-800 border-slate-700">
              <h3 className="text-white font-bold mb-3">Controls</h3>
              <div className="text-sm text-gray-300 space-y-1">
                <div>WASD / Arrows: Move</div>
                <div>SPACE: Attack</div>
                <div>Collect items for power!</div>
              </div>
            </Card>
          </div>

          {/* Game Area */}
          <div className="lg:col-span-3">
            <Card className="p-4 bg-slate-800 border-slate-700">
              <div 
                className="relative bg-gradient-to-br from-green-800 to-green-900 rounded-lg overflow-hidden mx-auto"
                style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
              >
                {/* Game Status Overlay */}
                {gameState.gameStatus !== 'playing' && (
                  <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
                    <div className="text-center">
                      {gameState.gameStatus === 'gameOver' && (
                        <>
                          <h2 className="text-4xl font-bold text-red-500 mb-4">💀 Game Over!</h2>
                          <p className="text-white mb-4">Final Score: {gameState.score}</p>
                        </>
                      )}
                      {gameState.gameStatus === 'victory' && (
                        <>
                          <h2 className="text-4xl font-bold text-yellow-500 mb-4">🏆 Victory!</h2>
                          <p className="text-white mb-4">You completed all levels! Score: {gameState.score}</p>
                        </>
                      )}
                      <Button onClick={resetGame} className="bg-blue-600 hover:bg-blue-700">
                        Play Again
                      </Button>
                    </div>
                  </div>
                )}

                {/* Player */}
                <div 
                  className="absolute transition-all duration-75 text-2xl"
                  style={{ 
                    left: gameState.player.x, 
                    top: gameState.player.y,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  🧙‍♂️
                </div>

                {/* Enemies */}
                {gameState.enemies.map(enemy => (
                  <div
                    key={enemy.id}
                    className="absolute transition-all duration-100 text-2xl"
                    style={{ 
                      left: enemy.x, 
                      top: enemy.y,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    {getEnemyEmoji(enemy.type)}
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                      <div className="bg-red-600 h-1 rounded" style={{ width: '30px' }}>
                        <div 
                          className="bg-green-500 h-1 rounded transition-all"
                          style={{ width: `${(enemy.health / (50 + gameState.level * 10)) * 30}px` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Items */}
                {gameState.items.map(item => (
                  <div
                    key={item.id}
                    className="absolute animate-bounce text-xl"
                    style={{ 
                      left: item.x, 
                      top: item.y,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    {getItemEmoji(item.type)}
                  </div>
                ))}

                {/* Attack indicator */}
                {keys[' '] && (
                  <div 
                    className="absolute border-4 border-yellow-400 rounded-full animate-ping"
                    style={{ 
                      left: gameState.player.x, 
                      top: gameState.player.y,
                      width: 100 + gameState.inventory.sword * 20,
                      height: 100 + gameState.inventory.sword * 20,
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}