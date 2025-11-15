import type { PlayerState } from "../types";

interface PlayerStatsProps {
  playerState: PlayerState;
}

export function PlayerStats({ playerState }: PlayerStatsProps) {
  const { financialState, personalityProfile } = playerState;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fi-FI", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPercentageColor = (value: number) => {
    if (value > 0.7) return "text-red-600";
    if (value > 0.4) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      {/* Financial State */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          💰 Talous
        </h2>
        <div className="space-y-3">
          <div>
            <div className="text-sm text-gray-600">Säästöt</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(financialState.savings)}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Velka</div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(financialState.debt)}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Kuukausitulo</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(financialState.monthlyIncome)}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Luottoluokitus</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${financialState.creditScore}%`,
                  }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900">
                {financialState.creditScore}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Personality Profile */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          📊 Profiili
        </h2>
        <div className="space-y-2">
          {[
            { label: "Riskinotto", value: personalityProfile.risk_tolerance },
            { label: "Itsevarmuus", value: personalityProfile.confidence },
            {
              label: "Vertaisvaikutus",
              value: personalityProfile.peer_influence,
            },
            {
              label: "Huijausvalpas",
              value: personalityProfile.scam_awareness,
            },
            {
              label: "Suunnittelu",
              value: personalityProfile.planning_ability,
            },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{label}</span>
                <span className={`font-medium ${getPercentageColor(value)}`}>
                  {Math.round(value * 100)}%
                </span>
              </div>
              <div className="bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    value > 0.7
                      ? "bg-red-500"
                      : value > 0.4
                        ? "bg-yellow-500"
                        : "bg-green-500"
                  }`}
                  style={{ width: `${value * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
