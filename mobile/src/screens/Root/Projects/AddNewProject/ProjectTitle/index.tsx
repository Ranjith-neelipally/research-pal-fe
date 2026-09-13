import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import React, { useLayoutEffect, useState } from 'react';
import { H3, Screen } from '../../../../../components/commonStyles/styles';
import { Grid3x3 } from 'lucide-react-native/icons';
import { Theme } from '../../../../../components/theme';
import Input from '../../../../../components/Input';
import Button from '../../../../../components/Button';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useAddNewProjectStore } from '../../../../../store/Projects/AddNewProject.store';
import { useStackScreenStore } from '../../../../../services/StackScreen/stackScreen.store';
import { checkProjectTitleExistsService } from '../../../../../services/Projects/Project';
import { validateRequiredMaxLength } from '../../../../../utils/apiValidation';

const ProjectTitle = () => {
  const router = useNavigation<NavigationProp<any>>();
  const setHeader = useStackScreenStore(state => state.setHeader);
  const resetHeader = useStackScreenStore(state => state.resetHeader);
  const projectTitleFromStore = useAddNewProjectStore(state => state.title);

  const [projectTitle, setProjectTitle] = useState<string>(
    projectTitleFromStore || '',
  );
  const [isCheckingTitle, setIsCheckingTitle] = useState(false);

  const setAddNewProjectTitle = useAddNewProjectStore(state => state.setTitle);
  const errorStatus = useAddNewProjectStore(state => state.errorStatus);

  React.useEffect(() => {
    setAddNewProjectTitle(projectTitle);
    if (errorStatus) {
      useAddNewProjectStore.getState().setErrorStatus('');
    }
  }, [errorStatus, projectTitle, setAddNewProjectTitle]);

  useLayoutEffect(() => {
    setHeader({
      screenTitle: 'New Project',
      headerSubtitle: 'Step 1 of 3',
      showProgressBar: true,
      projectIndex: 1,
      numberOfSteps: 3,
    });

    return () => {
      resetHeader();
    };
  }, [setHeader, resetHeader]);

  const handleContinue = async () => {
    const trimmedTitle = projectTitle.trim();
    const titleError = validateRequiredMaxLength(trimmedTitle, 100, 'Project title');
    if (titleError) {
      useAddNewProjectStore.getState().setErrorStatus(titleError);
      return;
    }

    setIsCheckingTitle(true);
    const existsRes = await checkProjectTitleExistsService(trimmedTitle);
    setIsCheckingTitle(false);

    if (existsRes.status !== 200) {
      const message =
        existsRes.message || 'Unable to validate project title. Please try again.';
      useAddNewProjectStore
        .getState()
        .setErrorStatus(message);
      Alert.alert('Title validation failed', message);
      return;
    }

    if ((existsRes.data as any)?.exists) {
      const message = 'Project title already exists';
      useAddNewProjectStore
        .getState()
        .setErrorStatus(message);
      Alert.alert('Duplicate title', message);
      return;
    }

    useAddNewProjectStore.getState().setErrorStatus('');
    router.navigate('ProjectLocation');
  };
  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1, justifyContent: 'space-between' }}>
            <View style={{ gap: 16 }}>
              <View
                style={{
                  backgroundColor: '#30a65b1a',
                  height: 56,
                  width: 56,
                  justifyContent: 'center',
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Grid3x3 height={32} width={32} color={Theme.colors.primary} />
              </View>
              <H3>Project Title</H3>
              <Input
                onChangeText={text => setProjectTitle(text)}
                value={projectTitle || ''}
                placeholder="e.g., Wheat Drought Tolerance Study 2024"
                label="Give your research project a descriptive name"
                error={errorStatus || undefined}
              />
            </View>
            <Button
              disabled={projectTitle.trim() === '' || isCheckingTitle}
              onPress={handleContinue}
            >
              {isCheckingTitle ? 'Checking...' : 'Continue'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

export default ProjectTitle;
