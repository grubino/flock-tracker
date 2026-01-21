import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Text,
  Button,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Badge,
  makeStyles,
  tokens,
  Spinner,
} from '@fluentui/react-components';
import {
  Add24Regular,
  MoreVertical24Regular,
  Edit24Regular,
  Delete24Regular,
  Play24Regular,
} from '@fluentui/react-icons';
import { livestreamsApi } from '../../services/api';
import type { Livestream } from '../../types';

const useStyles = makeStyles({
  container: {
    padding: tokens.spacingVerticalXXL,
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacingVerticalXL,
  },
  tableCard: {
    padding: tokens.spacingVerticalL,
  },
  statusBadge: {
    minWidth: '80px',
  },
  clickableRow: {
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
  },
});

const LivestreamList: React.FC = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: livestreams, isLoading } = useQuery({
    queryKey: ['livestreams'],
    queryFn: () => livestreamsApi.getAll().then(res => res.data),
    refetchOnMount: 'always',
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => livestreamsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestreams'] });
    },
  });

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete livestream "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleView = (id: number) => {
    navigate(`/livestreams/${id}/view`);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Spinner label="Loading livestreams..." />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <Text size={900} weight="bold">Livestreams</Text>
          <Text as="p" size={300}>
            Manage RTSP and RTMP video streams
          </Text>
        </div>
        <Button
          appearance="primary"
          icon={<Add24Regular />}
          onClick={() => navigate('/livestreams/new')}
        >
          Add Livestream
        </Button>
      </div>

      <Card className={styles.tableCard}>
        {livestreams && livestreams.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Location</TableHeaderCell>
                <TableHeaderCell>Description</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {livestreams.map((livestream: Livestream) => (
                <TableRow
                  key={livestream.id}
                  className={styles.clickableRow}
                  onClick={() => handleView(livestream.id)}
                >
                  <TableCell>
                    <Text weight="semibold">{livestream.name}</Text>
                  </TableCell>
                  <TableCell>
                    <Badge appearance="outline">
                      {livestream.stream_type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={styles.statusBadge}
                      appearance={livestream.is_active ? 'filled' : 'outline'}
                      color={livestream.is_active ? 'success' : 'subtle'}
                    >
                      {livestream.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {livestream.location?.name || '-'}
                  </TableCell>
                  <TableCell>
                    {livestream.description || '-'}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Menu>
                      <MenuTrigger disableButtonEnhancement>
                        <Button
                          appearance="subtle"
                          icon={<MoreVertical24Regular />}
                          aria-label="More actions"
                        />
                      </MenuTrigger>
                      <MenuPopover>
                        <MenuList>
                          <MenuItem
                            icon={<Play24Regular />}
                            onClick={() => handleView(livestream.id)}
                          >
                            View Stream
                          </MenuItem>
                          <MenuItem
                            icon={<Edit24Regular />}
                            onClick={() => navigate(`/livestreams/${livestream.id}/edit`)}
                          >
                            Edit
                          </MenuItem>
                          <MenuItem
                            icon={<Delete24Regular />}
                            onClick={() => handleDelete(livestream.id, livestream.name)}
                          >
                            Delete
                          </MenuItem>
                        </MenuList>
                      </MenuPopover>
                    </Menu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div style={{ textAlign: 'center', padding: tokens.spacingVerticalXXL }}>
            <Text size={500}>No livestreams found</Text>
            <div style={{ marginTop: tokens.spacingVerticalM }}>
              <Button
                appearance="primary"
                icon={<Add24Regular />}
                onClick={() => navigate('/livestreams/new')}
              >
                Add Your First Livestream
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default LivestreamList;
