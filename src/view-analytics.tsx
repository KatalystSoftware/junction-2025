#!/usr/bin/env tsx
/**
 * Analytics Dashboard Viewer
 *
 * View analytics for a game session in the terminal
 * Usage: pnpm analytics [sessionId]
 */

import React from "react";
import { render, Box, Text } from "ink";
import { getAnalyticsService } from "./mastra/analytics/index.ts";
import { renderAnalyticsDashboard } from "./mastra/analytics/analytics-tui.tsx";

interface Props {
  sessionId: string;
}

function AnalyticsDashboardApp({ sessionId }: Props) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dashboard, setDashboard] = React.useState<any>(null);

  React.useEffect(() => {
    async function loadAnalytics() {
      try {
        const service = getAnalyticsService();
        await service.loadAdvisorState(sessionId);
        const data = service.getDashboard();

        if (!data) {
          setError(`No analytics data found for session: ${sessionId}`);
        } else {
          setDashboard(data);
        }
      } catch (err) {
        setError(`Failed to load analytics: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsLoading(false);
      }
    }

    loadAnalytics();
  }, [sessionId]);

  if (isLoading) {
    return (
      <Box padding={1}>
        <Text color="cyan">Loading analytics for session: {sessionId}...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding={1} borderStyle="round" borderColor="red">
        <Text color="red" bold>
          Error: {error}
        </Text>
      </Box>
    );
  }

  if (!dashboard) {
    return (
      <Box padding={1}>
        <Text color="yellow">No data available</Text>
      </Box>
    );
  }

  return renderAnalyticsDashboard(dashboard);
}

// Main execution
const args = process.argv.slice(2);
const sessionId = args[0] || "default-session";

console.log(`\n🔍 Loading Analytics Dashboard for session: ${sessionId}\n`);

render(<AnalyticsDashboardApp sessionId={sessionId} />);
