import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  Card,
  Text,
  makeStyles,
  tokens,
  Spinner,
} from '@fluentui/react-components';
import { animalsApi } from '../../services/api';
import type { Animal } from '../../types';

const useStyles = makeStyles({
  container: {
    marginTop: tokens.spacingVerticalXL,
  },
  treeContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    marginTop: tokens.spacingVerticalM,
  },
  generation: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  generationLabel: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    textTransform: 'uppercase',
    marginBottom: tokens.spacingVerticalXS,
  },
  row: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
    '@media (max-width: 768px)': {
      flexDirection: 'column',
    },
  },
  animalCard: {
    padding: tokens.spacingVerticalM,
    minWidth: '200px',
    flex: '1',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: tokens.shadow8,
    },
  },
  currentAnimalCard: {
    padding: tokens.spacingVerticalM,
    minWidth: '200px',
    flex: '1',
    backgroundColor: tokens.colorBrandBackground2,
    border: `2px solid ${tokens.colorBrandBackground}`,
  },
  animalName: {
    fontWeight: tokens.fontWeightSemibold,
    display: 'block',
    marginBottom: tokens.spacingVerticalXXS,
  },
  animalTag: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    display: 'block',
  },
  animalType: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    display: 'block',
    marginTop: tokens.spacingVerticalXXS,
    textTransform: 'capitalize',
  },
  roleLabel: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase',
    marginBottom: tokens.spacingVerticalXXS,
  },
  emptyState: {
    textAlign: 'center',
    padding: tokens.spacingVerticalL,
    color: tokens.colorNeutralForeground2,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacingVerticalXL,
  },
});

interface FamilyTreeProps {
  animal: Animal;
}

export const FamilyTree: React.FC<FamilyTreeProps> = ({ animal }) => {
  const styles = useStyles();

  // Fetch all animals to find offspring and grandparents
  const { data: allAnimals, isLoading } = useQuery({
    queryKey: ['animals'],
    queryFn: () => animalsApi.getAll().then(res => res.data),
  });

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Text as="h2" size={600} weight="semibold" style={{ marginBottom: tokens.spacingVerticalM }}>
          Family Tree
        </Text>
        <div className={styles.loadingContainer}>
          <Spinner label="Loading family tree..." />
        </div>
      </div>
    );
  }

  // Find offspring (animals where current animal is sire or dam)
  const offspring = allAnimals?.filter(
    (a: Animal) => a.sire_id === animal.id || a.dam_id === animal.id
  ) || [];

  // Find grandparents
  const paternalGrandSire = allAnimals?.find((a: Animal) => a.id === animal.sire?.sire_id);
  const paternalGrandDam = allAnimals?.find((a: Animal) => a.id === animal.sire?.dam_id);
  const maternalGrandSire = allAnimals?.find((a: Animal) => a.id === animal.dam?.sire_id);
  const maternalGrandDam = allAnimals?.find((a: Animal) => a.id === animal.dam?.dam_id);

  const hasGrandparents = paternalGrandSire || paternalGrandDam || maternalGrandSire || maternalGrandDam;
  const hasParents = animal.sire || animal.dam;
  const hasOffspring = offspring.length > 0;

  const AnimalCard = ({ animal, role, isCurrent = false }: { animal: Animal; role?: string; isCurrent?: boolean }) => (
    <RouterLink
      to={`/animals/${animal.id}`}
      style={{ textDecoration: 'none', flex: 1 }}
    >
      <Card className={isCurrent ? styles.currentAnimalCard : styles.animalCard}>
        {role && <Text className={styles.roleLabel}>{role}</Text>}
        <Text className={styles.animalName} size={400}>
          {animal.name || animal.tag_number}
        </Text>
        {animal.name && (
          <Text className={styles.animalTag}>Tag: {animal.tag_number}</Text>
        )}
        <Text className={styles.animalType}>
          {animal.animal_type}
          {animal.animal_type === 'sheep' && animal.sheep_gender && ` (${animal.sheep_gender})`}
          {animal.animal_type === 'chicken' && animal.chicken_gender && ` (${animal.chicken_gender})`}
        </Text>
      </Card>
    </RouterLink>
  );

  if (!hasGrandparents && !hasParents && !hasOffspring) {
    return (
      <div className={styles.container}>
        <Text as="h2" size={600} weight="semibold" style={{ marginBottom: tokens.spacingVerticalM }}>
          Family Tree
        </Text>
        <Card>
          <div className={styles.emptyState}>
            <Text>No family relationships recorded for this animal</Text>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Text as="h2" size={600} weight="semibold" style={{ marginBottom: tokens.spacingVerticalM }}>
        Family Tree
      </Text>

      <div className={styles.treeContainer}>
        {/* Grandparents */}
        {hasGrandparents && (
          <div className={styles.generation}>
            <Text className={styles.generationLabel}>Grandparents</Text>
            <div className={styles.row}>
              {paternalGrandSire && <AnimalCard animal={paternalGrandSire} role="Paternal Grandsire" />}
              {paternalGrandDam && <AnimalCard animal={paternalGrandDam} role="Paternal Granddam" />}
              {maternalGrandSire && <AnimalCard animal={maternalGrandSire} role="Maternal Grandsire" />}
              {maternalGrandDam && <AnimalCard animal={maternalGrandDam} role="Maternal Granddam" />}
            </div>
          </div>
        )}

        {/* Parents */}
        {hasParents && (
          <div className={styles.generation}>
            <Text className={styles.generationLabel}>Parents</Text>
            <div className={styles.row}>
              {animal.sire && <AnimalCard animal={animal.sire} role="Sire" />}
              {animal.dam && <AnimalCard animal={animal.dam} role="Dam" />}
            </div>
          </div>
        )}

        {/* Current Animal */}
        <div className={styles.generation}>
          <Text className={styles.generationLabel}>Current</Text>
          <div className={styles.row}>
            <AnimalCard animal={animal} isCurrent={true} />
          </div>
        </div>

        {/* Offspring */}
        {hasOffspring && (
          <div className={styles.generation}>
            <Text className={styles.generationLabel}>Offspring ({offspring.length})</Text>
            <div className={styles.row}>
              {offspring.map((child: Animal) => (
                <AnimalCard
                  key={child.id}
                  animal={child}
                  role={child.sire_id === animal.id ? 'Child (via sire)' : 'Child (via dam)'}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
