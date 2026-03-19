import React from 'react';

interface CoinCounterProps {
  coins: number;
  highScore: number;
  newHighScore: boolean;
}

const CoinCounter: React.FC<CoinCounterProps> = ({ coins, highScore, newHighScore }) => {
  return (
    <div className="coin-counter">
      <div className="coin-count">
        <h3 className="coin-amount">Coins: {coins}</h3>
      </div>
      <h3
        className="high-score"
        style={{ background: newHighScore ? '#f6c44b38' : '#ffffff00' }}
      >
        {newHighScore ? 'New High Score: ' : 'High Score: '}
        {highScore}
      </h3>
    </div>
  );
};

export default CoinCounter;
