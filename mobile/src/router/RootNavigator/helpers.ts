import { Home, FolderKanban, BookOpen, Image } from 'lucide-react-native';
import HomeScreen from '../../screens/Root/Home';
import PhotosScreen from '../../screens/Root/Photos';
import Projects from '../../screens/Root/Projects';
import Diary from '../../screens/Root/Diary';

type IconProps = { size?: number; color?: string };
type Screen = {
  name: string;
  component: React.ComponentType;
  Icon: React.ComponentType<IconProps>;
};

export const Screens: Record<string, Screen> = {
  Home: {
    name: 'Home',
    component: HomeScreen,
    Icon: Home,
  },
  Projects: {
    name: 'Projects',
    component: Projects,
    Icon: FolderKanban,
  },
  Diary: {
    name: 'Diary',
    component: Diary,
    Icon: BookOpen,
  },
  Photos: {
    name: 'Photos',
    component: PhotosScreen,
    Icon: Image,
  },
};
