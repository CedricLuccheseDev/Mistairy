type Lang = 'fr' | 'en'

const translations = {
  fr: {
    // Home
    tagline: 'Jouez au Loup Garou sans cartes physiques et sans narrateur',
    createGame: 'Creer une partie',
    createGameSub: 'Deviens le maitre du jeu',
    creating: 'Creation...',
    joinGame: 'Rejoindre une partie',
    joinGameSub: 'Entre le code de ton ami',
    join: 'Rejoindre',
    joining: 'Verification...',
    codePlaceholder: 'CODE',
    invalidCode: 'Code invalide (6 caracteres)',
    createError: 'Erreur lors de la creation',
    gameNotFound: 'Partie introuvable',
    connectionError: 'Erreur de connexion',
    playerCount: '5 - 18 joueurs',

    // Lobby
    gameCode: 'Code de la partie',
    scanToJoin: 'Scannez pour rejoindre',
    share: 'Partager',
    config: 'Configuration',
    players: 'Joueurs',
    playersNeeded: 'joueur(s) requis',
    readyToPlay: 'Pret a jouer !',
    waitingForHost: 'En attente du lancement par l\'hote',
    startGame: 'Lancer la partie',
    starting: 'Lancement...',
    leaveGame: 'Quitter la partie',
    you: 'Toi',
    waiting: 'En attente',
    testMode: 'Mode Test',
    copyTestUrl: 'Copier URL',

    // Auth
    login: 'Connexion',
    loginTitle: 'Bienvenue',
    loginSubtitle: 'Connecte-toi pour sauvegarder tes parties',
    continueWithGoogle: 'Continuer avec Google',
    continueWithApple: 'Continuer avec Apple',
    termsNotice: 'En continuant, tu acceptes nos',
    termsLink: 'conditions d\'utilisation',
    tooltipLogin: 'Se connecter',
    profileMenu: 'Profil',
    profileSignOut: 'Se deconnecter',
    back: 'Retour',

    // Footer
    footer: '@ ClHub',

    // Join Form
    enterFirstName: 'Entre ton prénom',
    firstName: 'Prenom',
    joinTheGame: 'Rejoindre la partie',
    playersWaiting: 'joueur(s) en attente',
    or: 'ou',
    quickGoogleLogin: 'Connexion rapide avec ton compte',
    gameInProgress: 'Partie en cours',
    cannotJoinGame: 'Tu ne peux plus rejoindre cette partie',
    backToHome: 'Retour a l\'accueil',
    googleAuthError: 'Erreur de connexion Google',

    // Game
    teamWerewolf: 'Equipe Loups-Garous',
    teamVillage: 'Equipe Village',
    yourPack: 'Ta meute',
    understood: 'Compris',
    journal: 'Journal',
    configuration: 'Configuration',

    // Profile
    profileNotLoggedIn: 'Non connecte',
    profileLoginPrompt: 'Connecte-toi pour acceder a ton profil',
    profileMemberSince: 'Membre depuis',
    profileGamesPlayed: 'Parties',
    profileWins: 'Victoires',
    profileWolfWins: 'Loups',
    profileSettings: 'Parametres',
    profileLanguage: 'Langue',
    profileInformation: 'Informations',
    profileHelp: 'Aide',
    profileHelpSub: 'Comment jouer a Mistairy',
    profileTerms: 'Conditions',
    profileTermsSub: 'Regles d\'utilisation',
    profileSigningOut: 'Deconnexion...',

    // Common
    loading: 'Chargement...',
    error: 'Erreur',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    copied: 'Copie !'
  },
  en: {
    // Home
    tagline: 'Play Werewolf without physical cards and no narrator',
    createGame: 'Create a game',
    createGameSub: 'Become the game master',
    creating: 'Creating...',
    joinGame: 'Join a game',
    joinGameSub: 'Enter your friend\'s code',
    join: 'Join',
    joining: 'Checking...',
    codePlaceholder: 'CODE',
    invalidCode: 'Invalid code (6 characters)',
    createError: 'Error creating game',
    gameNotFound: 'Game not found',
    connectionError: 'Connection error',
    playerCount: '5 - 18 players',

    // Lobby
    gameCode: 'Game code',
    scanToJoin: 'Scan to join',
    share: 'Share',
    config: 'Settings',
    players: 'Players',
    playersNeeded: 'player(s) needed',
    readyToPlay: 'Ready to play!',
    waitingForHost: 'Waiting for host to start',
    startGame: 'Start game',
    starting: 'Starting...',
    leaveGame: 'Leave game',
    you: 'You',
    waiting: 'Waiting',
    testMode: 'Test Mode',
    copyTestUrl: 'Copy URL',

    // Auth
    login: 'Login',
    loginTitle: 'Welcome',
    loginSubtitle: 'Sign in to save your games',
    continueWithGoogle: 'Continue with Google',
    continueWithApple: 'Continue with Apple',
    termsNotice: 'By continuing, you agree to our',
    termsLink: 'terms of service',
    tooltipLogin: 'Sign in',
    profileMenu: 'Profile',
    profileSignOut: 'Sign out',
    back: 'Back',

    // Footer
    footer: '@ ClHub',

    // Join Form
    enterFirstName: 'Enter your first name',
    firstName: 'First name',
    joinTheGame: 'Join the game',
    playersWaiting: 'player(s) waiting',
    or: 'or',
    quickGoogleLogin: 'Quick login with your account',
    gameInProgress: 'Game in progress',
    cannotJoinGame: 'You can no longer join this game',
    backToHome: 'Back to home',
    googleAuthError: 'Google login error',

    // Game
    teamWerewolf: 'Werewolf Team',
    teamVillage: 'Village Team',
    yourPack: 'Your pack',
    understood: 'Got it',
    journal: 'Journal',
    configuration: 'Settings',

    // Profile
    profileNotLoggedIn: 'Not logged in',
    profileLoginPrompt: 'Sign in to access your profile',
    profileMemberSince: 'Member since',
    profileGamesPlayed: 'Games',
    profileWins: 'Wins',
    profileWolfWins: 'Wolf wins',
    profileSettings: 'Settings',
    profileLanguage: 'Language',
    profileInformation: 'Information',
    profileHelp: 'Help',
    profileHelpSub: 'How to play Mistairy',
    profileTerms: 'Terms',
    profileTermsSub: 'Terms of service',
    profileSigningOut: 'Signing out...',

    // Common
    loading: 'Loading...',
    error: 'Error',
    cancel: 'Cancel',
    confirm: 'Confirm',
    copied: 'Copied!'
  }
} as const

const currentLang = ref<Lang>('fr')

export function useI18n() {
  const t = computed(() => translations[currentLang.value])

  function setLang(lang: Lang) {
    currentLang.value = lang
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mistairy-lang', lang)
    }
  }

  function toggleLang() {
    setLang(currentLang.value === 'fr' ? 'en' : 'fr')
  }

  // Initialize from localStorage
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('mistairy-lang') as Lang | null
    if (saved && (saved === 'fr' || saved === 'en')) {
      currentLang.value = saved
    }
  }

  return {
    lang: currentLang,
    t,
    setLang,
    toggleLang
  }
}
