import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Text,
  Button,
  Badge,
  makeStyles,
  tokens,
  Spinner,
} from '@fluentui/react-components';
import { Edit24Regular, ArrowLeft24Regular } from '@fluentui/react-icons';
import { livestreamsApi } from '../../services/api';
import VideoPlayer from './VideoPlayer';

const useStyles = makeStyles({
  container: {
    padding: tokens.spacingVerticalXXL,
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacingVerticalXL,
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalL,
  },
  buttonGroup: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
  },
  videoCard: {
    padding: tokens.spacingVerticalL,
    marginBottom: tokens.spacingVerticalL,
  },
  infoCard: {
    padding: tokens.spacingVerticalXL,
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: tokens.spacingVerticalL,
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
  },
});

const LivestreamViewer: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: livestream, isLoading } = useQuery({
    queryKey: ['livestreams', id],
    queryFn: () => livestreamsApi.getById(parseInt(id!)).then(res => res.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Spinner label="Loading livestream..." />
        </div>
      </div>
    );
  }

  if (!livestream) {
    return (
      <div className={styles.container}>
        <Text size={500}>Livestream not found</Text>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <Button
            appearance="subtle"
            icon={<ArrowLeft24Regular />}
            onClick={() => navigate('/livestreams')}
          >
            Back
          </Button>
          <div>
            <Text size={900} weight="bold">{livestream.name}</Text>
            {livestream.description && (
              <Text as="p" size={300}>{livestream.description}</Text>
            )}
          </div>
        </div>
        <div className={styles.buttonGroup}>
          <Button
            appearance="primary"
            icon={<Edit24Regular />}
            onClick={() => navigate(`/livestreams/${livestream.id}/edit`)}
          >
            Edit
          </Button>
        </div>
      </div>

      <Card className={styles.videoCard}>
        <VideoPlayer livestreamId={livestream.id} />
      </Card>

      <Card className={styles.infoCard}>
        <Text size={600} weight="semibold" style={{ marginBottom: tokens.spacingVerticalL }}>
          Stream Information
        </Text>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <Text size={300} weight="semibold">Stream Type</Text>
            <Badge appearance="outline">{livestream.stream_type.toUpperCase()}</Badge>
          </div>

          <div className={styles.infoItem}>
            <Text size={300} weight="semibold">Status</Text>
            <Badge
              appearance={livestream.is_active ? 'filled' : 'outline'}
              color={livestream.is_active ? 'success' : 'subtle'}
            >
              {livestream.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          {livestream.location && (
            <div className={styles.infoItem}>
              <Text size={300} weight="semibold">Location</Text>
              <Text size={400}>{livestream.location.name}</Text>
            </div>
          )}

          <div className={styles.infoItem}>
            <Text size={300} weight="semibold">Stream URL</Text>
            <Text size={300} style={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
              {livestream.stream_url}
            </Text>
          </div>

          {livestream.username && (
            <div className={styles.infoItem}>
              <Text size={300} weight="semibold">Authentication</Text>
              <Text size={400}>Username: {livestream.username}</Text>
              <Text size={300}>(Password hidden)</Text>
            </div>
          )}

          <div className={styles.infoItem}>
            <Text size={300} weight="semibold">Created</Text>
            <Text size={400}>
              {new Date(livestream.created_at).toLocaleDateString()}
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LivestreamViewer;
