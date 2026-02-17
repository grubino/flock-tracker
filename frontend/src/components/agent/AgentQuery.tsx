import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  Text,
  Button,
  Input,
  makeStyles,
  tokens,
  Spinner,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
} from '@fluentui/react-components';
import { Send24Regular, ChatSparkle24Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  inputSection: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    alignItems: 'flex-start',
  },
  input: {
    flexGrow: 1,
  },
  examplesSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  exampleButton: {
    textAlign: 'left',
    justifyContent: 'flex-start',
  },
  resultsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  statusText: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  sqlSection: {
    backgroundColor: tokens.colorNeutralBackground2,
    padding: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusMedium,
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase200,
    whiteSpace: 'pre-wrap',
    overflowX: 'auto',
  },
  answerSection: {
    backgroundColor: tokens.colorNeutralBackground3,
    padding: tokens.spacingVerticalL,
    borderRadius: tokens.borderRadiusMedium,
    fontSize: tokens.fontSizeBase300,
    lineHeight: '1.6',
  },
  stepsSection: {
    backgroundColor: tokens.colorNeutralBackground2,
    padding: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusMedium,
  },
  step: {
    marginBottom: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    '&:last-child': {
      marginBottom: 0,
      paddingBottom: 0,
      borderBottom: 'none',
    },
  },
});

const EXAMPLE_QUESTIONS = [
  "How many sheep do we have?",
  "What are the total expenses for feed this month?",
  "Show me all animals born this year",
  "What's the average expense per category?",
  "Which animals need vaccinations soon?",
  "What are the top 5 most expensive items we've purchased?",
];

interface AgentStep {
  action: string;
  observation: string;
}

const AgentQuery: React.FC = () => {
  const styles = useStyles();
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [sql, setSql] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleSubmit = async () => {
    if (!question.trim()) return;

    // Reset state
    setIsLoading(true);
    setStatus(null);
    setSql(null);
    setAnswer(null);
    setSteps([]);
    setError(null);

    // Close any existing EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      // Get auth token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Not authenticated. Please log in.');
        setIsLoading(false);
        return;
      }

      // Create EventSource for streaming
      const encodedQuestion = encodeURIComponent(question);
      const url = `/api/agent/query-stream?question=${encodedQuestion}`;

      // EventSource doesn't support custom headers, so we'll use a different approach
      // We'll use fetch with ReadableStream instead
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const event = JSON.parse(data);

              switch (event.type) {
                case 'status':
                  setStatus(event.message);
                  break;
                case 'sql':
                  setSql(event.query);
                  setStatus('Executing SQL query...');
                  break;
                case 'answer':
                  setAnswer(event.text);
                  setStatus('Complete');
                  break;
                case 'steps':
                  setSteps(event.steps || []);
                  break;
                case 'complete':
                  setIsLoading(false);
                  if (!event.success) {
                    setError('Query completed with errors');
                  }
                  break;
                case 'error':
                  setError(event.message);
                  setIsLoading(false);
                  break;
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error('Error querying agent:', err);
      setError(err.message || 'Failed to query the database');
      setIsLoading(false);
    }
  };

  const handleExampleClick = (exampleQuestion: string) => {
    setQuestion(exampleQuestion);
  };

  return (
    <div className={styles.container}>
      <Card>
        <div className={styles.header}>
          <ChatSparkle24Regular />
          <Text size={600} weight="semibold">
            Ask Questions About Your Data
          </Text>
        </div>

        <Text block style={{ marginTop: tokens.spacingVerticalS }}>
          Use natural language to query your flock tracker database. The AI agent will translate your question
          into SQL and provide an answer.
        </Text>

        <div className={styles.inputSection} style={{ marginTop: tokens.spacingVerticalL }}>
          <Input
            className={styles.input}
            placeholder="Ask a question about your animals, expenses, or events..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={isLoading}
            size="large"
          />
          <Button
            appearance="primary"
            icon={<Send24Regular />}
            onClick={handleSubmit}
            disabled={isLoading || !question.trim()}
            size="large"
          >
            Ask
          </Button>
        </div>

        <div className={styles.examplesSection} style={{ marginTop: tokens.spacingVerticalM }}>
          <Text size={300} weight="semibold">
            Example questions:
          </Text>
          {EXAMPLE_QUESTIONS.map((example, index) => (
            <Button
              key={index}
              appearance="subtle"
              className={styles.exampleButton}
              onClick={() => handleExampleClick(example)}
              disabled={isLoading}
              size="small"
            >
              {example}
            </Button>
          ))}
        </div>
      </Card>

      {(isLoading || status || answer || error) && (
        <Card>
          <div className={styles.resultsSection}>
            {/* Status */}
            {isLoading && status && (
              <div className={styles.statusText}>
                <Spinner size="tiny" />
                <Text size={300}>{status}</Text>
              </div>
            )}

            {/* Error */}
            {error && (
              <MessageBar intent="error">
                <MessageBarBody>
                  <MessageBarTitle>Error</MessageBarTitle>
                  {error}
                </MessageBarBody>
              </MessageBar>
            )}

            {/* SQL Query */}
            {sql && (
              <div>
                <Text weight="semibold" block style={{ marginBottom: tokens.spacingVerticalS }}>
                  SQL Query:
                </Text>
                <div className={styles.sqlSection}>{sql}</div>
              </div>
            )}

            {/* Answer */}
            {answer && (
              <div>
                <Text weight="semibold" block style={{ marginBottom: tokens.spacingVerticalS }}>
                  Answer:
                </Text>
                <div className={styles.answerSection}>{answer}</div>
              </div>
            )}

            {/* Intermediate Steps */}
            {steps.length > 0 && (
              <div>
                <Text weight="semibold" block style={{ marginBottom: tokens.spacingVerticalS }}>
                  Reasoning Steps:
                </Text>
                <div className={styles.stepsSection}>
                  {steps.map((step, index) => (
                    <div key={index} className={styles.step}>
                      <Text size={200} weight="semibold" block>
                        Step {index + 1}:
                      </Text>
                      {step.action && (
                        <Text size={200} block style={{ marginTop: tokens.spacingVerticalXS }}>
                          <strong>Action:</strong> {step.action}
                        </Text>
                      )}
                      {step.observation && (
                        <Text size={200} block style={{ marginTop: tokens.spacingVerticalXS }}>
                          <strong>Observation:</strong> {step.observation}
                        </Text>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AgentQuery;
