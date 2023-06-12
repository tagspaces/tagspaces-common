import React, { useState } from 'react';
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
import { createTheme, ThemeProvider } from '@mui/material/styles';
import DialogCloseButton from './DialogCloseButton';

const MainMenu: React.FC<{
  menuItems?: Array<any>;
  print: string;
  about: string;
  aboutTitle?: string;
  aboutLink: () => void;
}> = ({ menuItems, print, about, aboutTitle, aboutLink }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [isAboutDialogOpened, setAboutDialogOpened] = useState<boolean>(false);

  const handleFabClick = (event: any) => {
    setAnchorEl(event.currentTarget);
  };

  const actions = [
    ...(menuItems && menuItems.length > 0 ? menuItems : []),
    ...(print
      ? [
          {
            icon: <PrintIcon />,
            name: print,
            dataTID: 'printTID',
            action: () => {
              setAnchorEl(null);
              window.print();
            }
          }
        ]
      : []),
    ...(about
      ? [
          {
            icon: <AboutIcon />,
            name: about,
            dataTID: 'aboutTID',
            action: () => {
              setAnchorEl(null);
              setAboutDialogOpened(true);
            }
          }
        ]
      : [])
  ];

  const primaryBackgroundColor = window
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
  });

  return (
    <ThemeProvider theme={tsTheme}>
      {Boolean(anchorEl) && (
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
              key={action.name}
              onClick={action.action}
            >
              <ListItemIcon>{action.icon}</ListItemIcon>
              <ListItemText>{action.name}</ListItemText>
            </MenuItem>
          ))}
        </Menu>
      )}
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
        <DialogContent>
          Please visit the dedicated&nbsp;
          <Link
            href="#"
            variant="body2"
            onClick={(event: React.SyntheticEvent) => {
              event.preventDefault();
              aboutLink();
            }}
          >
            project page
          </Link>
          &nbsp; in the TagSpaces' documentation for more details.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAboutDialogOpened(false)} color="primary">
            Ok
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
};

export default MainMenu;
