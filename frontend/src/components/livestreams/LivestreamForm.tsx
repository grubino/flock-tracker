import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Text,
  Button,
  Input,
  Field,
  Textarea,
  Combobox,
  Option,
  Switch,
  makeStyles,
  tokens,
  Spinner,
} from '@fluentui/react-components';
import { livestreamsApi, locationsApi } from '../../services/api';
import type { LivestreamCreateRequest } from '../../types';

const useStyles = makeStyles({
  container: {
    padding: tokens.spacingVerticalXXL,
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    marginBottom: tokens.spacingVerticalXL,
  },
  formCard: {
    padding: tokens.spacingVerticalXL,
  },
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  buttonGroup: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalXL,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
  },
});

const LivestreamForm: React.FC<{ isEdit?: boolean }> = ({ isEdit = false }) => {
  const styles = useStyles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [streamType, setStreamType] = useState<'rtsp' | 'rtmp'>('rtsp');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [locationId, setLocationId] = useState<number | null>(null);

  const { data: livestream, isLoading: isLoadingLivestream } = useQuery({
    queryKey: ['livestreams', id],
    queryFn: () => livestreamsApi.getById(parseInt(id!)).then(res => res.data),
    enabled: isEdit && !!id,
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsApi.getAll().then(res => res.data),
  });

  useEffect(() => {
    if (livestream) {
      setName(livestream.name);
      setDescription(livestream.description || '');
      setStreamUrl(livestream.stream_url);
      setStreamType(livestream.stream_type);
      setUsername(livestream.username || '');
      setPassword(livestream.password || '');
      setIsActive(livestream.is_active);
      setLocationId(livestream.location_id || null);
    }
  }, [livestream]);

  const createMutation = useMutation({
    mutationFn: (data: LivestreamCreateRequest) => livestreamsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestreams'] });
      navigate('/livestreams');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<LivestreamCreateRequest>) =>
      livestream ? livestreamsApi.update(livestream.id, data) : Promise.reject(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestreams'] });
      navigate('/livestreams');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const livestreamData: LivestreamCreateRequest = {
      name,
      description: description || undefined,
      stream_url: streamUrl,
      stream_type: streamType,
      location_id: locationId || undefined,
      is_active: isActive,
      username: username || undefined,
      password: password || undefined,
    };

    if (isEdit) {
      updateMutation.mutate(livestreamData);
    } else {
      createMutation.mutate(livestreamData);
    }
  };

  if (isEdit && isLoadingLivestream) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Spinner label="Loading livestream..." />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text size={900} weight="bold">
          {isEdit ? 'Edit Livestream' : 'Add Livestream'}
        </Text>
        <Text as="p" size={300}>
          {isEdit ? 'Update livestream configuration' : 'Configure a new RTSP or RTMP livestream'}
        </Text>
      </div>

      <Card className={styles.formCard}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formSection}>
            <Field label="Name" required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Barn Camera 1"
                required
              />
            </Field>

            <Field label="Description">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </Field>

            <Field label="Stream Type" required>
              <Combobox
                value={streamType}
                onOptionSelect={(_, data) => setStreamType(data.optionValue as 'rtsp' | 'rtmp')}
                required
              >
                <Option value="rtsp">RTSP</Option>
                <Option value="rtmp">RTMP</Option>
              </Combobox>
            </Field>

            <Field label="Stream URL" required>
              <Input
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="e.g., rtsp://192.168.1.100:554/stream1"
                required
              />
            </Field>

            <Field label="Location (Optional)">
              <Combobox
                placeholder="Select a location"
                value={locationId ? locations?.find(l => l.id === locationId)?.name : ''}
                onOptionSelect={(_, data) => setLocationId(data.optionValue ? parseInt(data.optionValue) : null)}
              >
                <Option value="">None</Option>
                {locations?.map((location) => (
                  <Option key={location.id} value={location.id.toString()}>
                    {location.name}
                  </Option>
                ))}
              </Combobox>
            </Field>

            <Field label="Username (Optional)">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Stream authentication username"
              />
            </Field>

            <Field label="Password (Optional)">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Stream authentication password"
              />
            </Field>

            <Field label="Status">
              <Switch
                checked={isActive}
                onChange={(e) => setIsActive(e.currentTarget.checked)}
                label={isActive ? 'Active' : 'Inactive'}
              />
            </Field>

            <div className={styles.buttonGroup}>
              <Button
                type="submit"
                appearance="primary"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {isEdit ? 'Update Livestream' : 'Create Livestream'}
              </Button>
              <Button
                appearance="secondary"
                onClick={() => navigate('/livestreams')}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default LivestreamForm;
