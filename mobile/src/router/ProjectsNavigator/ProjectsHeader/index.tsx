import { TouchableOpacity, View } from 'react-native';
import React from 'react';
import { SmallH1, MutedText } from '../../../components/commonStyles/styles';
import { ArrowLeft } from 'lucide-react-native/icons';
import { Theme } from '../../../components/theme';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useProjectsActionStore } from '../../../store/Projects/Projects.store';
import { useStackScreenStore } from '../../../services/StackScreen/stackScreen.store';
import { EllipsisVertical, MapPin, Pencil, Trash2 } from 'lucide-react-native';
import {
  MoreOption,
  MoreOptionsCard,
} from '../../../screens/Root/Home/Ideas/styles';

interface ProjectsHeaderProps {
  customHeaderIcon?: React.ReactNode;
}

const ProjectsHeader = ({ customHeaderIcon }: ProjectsHeaderProps) => {
  const router = useNavigation<NavigationProp<any>>();
  const setIsProjectAdding = useProjectsActionStore(
    state => state.setIsProjectAdding,
  );

  const {
    projectIndex,
    numberOfSteps,
    screenTitle,
    headerSubtitle,
    headerIcon,
    headerSubIcon,
    showProgressBar,
    actionButtons,
    showActionsMenu,
  } = useStackScreenStore(state => state.header);

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.goBack();
    } else {
      setIsProjectAdding(false);
    }
  };

  const getIcons = (iconName: string) => {
    switch (iconName) {
      case 'location':
        return <MapPin size={12} color={Theme.colors.mutedForeground} />;
      case 'edit':
        return <Pencil size={16} color={Theme.colors.mutedForeground} />;
      case 'delete':
        return <Trash2 size={16} color="#d22d2d" />;
      default:
        return null;
    }
  };

  const renderActionButtons = () => {
    return actionButtons?.map((button, index) => (
      <MoreOption key={index} onPress={button.onPress}>
        {getIcons(button.icon!)}

        <MutedText>{button.title}</MutedText>
      </MoreOption>
    ));
  };

  return (
    <View style={{ paddingHorizontal: 16, backgroundColor: '#101318' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <TouchableOpacity onPress={handleBackPress}>
            <ArrowLeft color={Theme.colors.fontSecondary} height={24} />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            {customHeaderIcon ?? headerIcon}
            <View>
              <SmallH1>{screenTitle || 'ProjectHeader'}</SmallH1>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                {headerSubIcon && getIcons(headerSubIcon)}
                {headerSubtitle && <MutedText>{headerSubtitle}</MutedText>}
              </View>
            </View>
          </View>
        </View>
        {showActionsMenu && (
          <>
            <TouchableOpacity>
              <EllipsisVertical
                color={Theme.colors.fontSecondary}
                height={24}
              />
            </TouchableOpacity>

            <MoreOptionsCard style={{ top: 40 }}>
              {renderActionButtons()}
            </MoreOptionsCard>
          </>
        )}
      </View>

      <View style={{ flexDirection: 'row', marginTop: 12, gap: 6 }}>
        {showProgressBar && numberOfSteps && projectIndex && (
          <>
            {Array.from({ length: numberOfSteps }).map((_, idx) => (
              <View
                key={idx}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 3,
                  backgroundColor: idx < projectIndex ? '#4ade80' : '#334155',
                  opacity: idx < projectIndex ? 1 : 0.5,
                }}
              />
            ))}
          </>
        )}
      </View>
    </View>
  );
};

export default ProjectsHeader;
