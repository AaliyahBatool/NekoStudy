/**
 * UI vocabulary only. Technical identifiers, API routes, database tables,
 * and socket events retain their technical names.
 */
export const copy = {
  brand: {
    name: 'NekoStudy',
    tagline: 'A little space to focus, together.',
  },
  room: {
    singular: 'cottage',
    plural: 'cottages',
    Singular: 'Cottage',
    Plural: 'Cottages',
  },
  member: {
    singular: 'neighbour',
    plural: 'neighbours',
    Singular: 'Neighbour',
    Plural: 'Neighbours',
  },
  invite: {
    singular: 'door key',
    plural: 'door keys',
    Singular: 'Door key',
    Plural: 'Door keys',
  },
  scene: {
    singular: 'window view',
    plural: 'window views',
    Singular: 'Window view',
    Plural: 'Window views',
  },
  break: {
    singular: 'tea break',
    plural: 'tea breaks',
    Singular: 'Tea break',
    Plural: 'Tea breaks',
  },
  navigation: {
    home: 'Home',
    stats: 'Stats',
    settings: 'Settings',
  },
  home: {
    eyebrow: {
      studySpace: 'YOUR STUDY SPACE',
      spaces: 'YOUR SPACES',
      together: 'TOGETHER',
      setMood: 'SET THE MOOD',
    },
    greeting: 'Welcome to your little corner.',
    subtitle: 'Find a quiet view and settle into your work.',
    myRooms: 'My cottages',
    joinedRooms: 'Joined cottages',
    continueStudying: 'Continue studying',
    chooseScene: 'Choose a window view',
    chooseSceneDescription: 'Pick a backdrop for your next study session.',
    emptyScenes: 'No window views are available right now.',
    loadingScenes: 'Preparing your window views…',
    sceneError: 'We could not load the window views.',
    retry: 'Try again',
    comingSoon: 'Coming in a later update',
    noRooms: 'Your cottages will appear here.',
    noJoinedRooms: 'Cottages you join will appear here.',
    startHere: 'Choose a window view to get started.',
  },
  status: {
    checking: 'Checking services…',
    connected: 'Services connected',
    unavailable: 'Some services are unavailable',
  },
  errors: {
    network: 'Could not reach the NekoStudy API.',
    unexpected: 'Something went wrong. Please try again.',
  },
  notFound: {
    title: 'This page is not here yet.',
    home: 'Back to Home',
  },
} as const;

export const text = {
  createRoom: `Create ${copy.room.singular}`,
  myRooms: `My ${copy.room.plural}`,
  roomFull: `This ${copy.room.singular} is full.`,
  roomClosed: `This ${copy.room.singular} is closed.`,
  shareInvite: `Share a ${copy.invite.singular}`,
  pickScene: `Choose a ${copy.scene.singular}`,
  members: copy.member.Plural,
  breakLabel: copy.break.Singular,
} as const;
