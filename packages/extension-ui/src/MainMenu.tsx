import React from 'react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import Link from '@mui/material/Link';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Fab from '@mui/material/Fab';
import MoreIcon from '@mui/icons-material/MoreVert';
import AboutIcon from '@mui/icons-material/Info';
import PrintIcon from '@mui/icons-material/Print';
import DialogCloseButton from './DialogCloseButton';
import useEventListener from './useEventListener';

export type MainMenuItem = {
  id: string;
  icon?: any;
  name: 'Toggle Line Numbers';
  action: () => void;
};

const MainMenu: React.FC<{
  menuItems: Array<MainMenuItem>;
  aboutTitle?: string;
  aboutDialogContent?: React.ReactElement;
  aboutLink?: () => void; // this will not be set if aboutDialogContent is provided
}> = ({ menuItems, aboutTitle, aboutDialogContent, aboutLink }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [isAboutDialogOpened, setAboutDialogOpened] =
    React.useState<boolean>(false);
  const [isFabVisible, setFabVisible] = React.useState<boolean>(true);

  useEventListener('beforeprint', event => {
    setFabVisible(false);
  });

  useEventListener('afterprint', event => {
    setFabVisible(true);
  });

  const handleFabClick = (event: any) => {
    setAnchorEl(event.currentTarget);
  };

  const actions = menuItems.map(item => {
    if (item.id === 'print') {
      return {
        ...item,
        dataTID: item.id + 'TID',
        icon: <PrintIcon />,
        action: () => {
          setAnchorEl(null);
          window.print();
        }
      };
    } else if (item.id === 'about') {
      return {
        ...item,
        dataTID: item.id + 'TID',
        icon: <AboutIcon />,
        action: () => {
          setAnchorEl(null);
          setAboutDialogOpened(true);
        }
      };
    }
    return { ...item, dataTID: item.id + 'TID' };
  });

  /* const primaryBackgroundColor = window
      .getComputedStyle(document.documentElement)
      .getPropertyValue('--primary-color')
      .trim();
    const primaryTextColor = window
      .getComputedStyle(document.documentElement)
      .getPropertyValue('--primary-text-color')
      .trim();

    const tsTheme = createTheme({
      palette: {
        primary: {
          main: primaryBackgroundColor ? primaryBackgroundColor : '#11cb5f',
          contrastText: primaryTextColor ? primaryTextColor : '#ffffff'
        },
        secondary: {
          main: '#11cb5f',
          contrastText: '#ffffff'
        }
      }
    });*/

  const dialogContent = aboutDialogContent ? (
    aboutDialogContent
  ) : (
    <>
      Please visit the dedicated&nbsp;
      <Link
        href="#"
        variant="body2"
        onClick={(event: React.SyntheticEvent) => {
          event.preventDefault();
          if (aboutLink) {
            aboutLink();
          }
        }}
      >
        project page
      </Link>
      &nbsp; in the TagSpaces' documentation for more details.
    </>
  );

  return (
    <>
      <Menu
        id="fab-menu"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left'
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center'
        }}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {actions.map(action => (
          <MenuItem
            data-tid={action.dataTID}
            key={action.dataTID}
            onClick={action.action}
          >
            <ListItemIcon>{action.icon}</ListItemIcon>
            <ListItemText>{action.name || action.id}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
      {isFabVisible && (
        <Fab
          data-tid="mainMenuTID"
          color="primary"
          aria-label="open extension menu"
          style={{
            position: 'absolute',
            right: 20,
            bottom: 20,
            width: 50,
            height: 50
          }}
          onClick={handleFabClick}
        >
          <MoreIcon />
        </Fab>
      )}
      <Dialog
        open={isAboutDialogOpened}
        onClose={() => {
          setAboutDialogOpened(false);
        }}
        aria-labelledby="dialog-title"
      >
        <DialogTitle id="dialog-title">
          {aboutTitle ? aboutTitle : ''}
          <DialogCloseButton onClick={() => setAboutDialogOpened(false)} />
        </DialogTitle>
        <DialogContent>{dialogContent}</DialogContent>
        <DialogActions>
          <Button onClick={() => setAboutDialogOpened(false)} color="primary">
            Ok
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MainMenu;
