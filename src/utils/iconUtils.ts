export const getAppIconImage = (appIcon: string) => {
  switch (appIcon) {
    case 'red':
      return require('../../assets/icon-red.png');
    case 'green':
      return require('../../assets/icon-green.png');
    case 'purple':
      return require('../../assets/icon-purple.png');
    case 'orange':
      return require('../../assets/icon-orange.png');
    default:
      return require('../../assets/icon.png');
  }
};
