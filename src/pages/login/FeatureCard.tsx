import React from 'react';

interface FeatureCardProps {
  icon: React.ReactNode;
  text: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, text }) => {
  return (
    <div className="elog-feature-card">
      <div className="elog-feature-icon-wrapper">
        {icon}
      </div>
      <h3 className="elog-feature-text">{text}</h3>
    </div>
  );
};

export default FeatureCard;
