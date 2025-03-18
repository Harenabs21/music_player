import { useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import MusicControl, { Command } from 'react-native-music-control';
export default function useAudioPlayer(audioFiles: any[]) {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [currentIndex, setCurrentIndex] = useState<number | null>(null);
    const [currentTitle, setCurrentTitle] = useState<string | null>(null); // 🔥 Ajout du titre en cours
    const [isFirstPlay, setIsFirstPlay] = useState(true);
    const [state, setState] = useState({
        isPlaying: false,
        position: 0,
        duration: 1,
    });

    const loadAndPlayAudio = async (index: number) => {
        if (index < 0 || index >= audioFiles.length) return;
    
        const file = audioFiles[index];
    
        if (sound) {
            await sound.unloadAsync();
        }
    
        const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: file.uri },
            { shouldPlay: true } // ✅ Active la lecture immédiate
        );
    
        newSound.setOnPlaybackStatusUpdate(async (status) => {
            if (status.isLoaded) {
                setState({
                    isPlaying: status.isPlaying,
                    position: status.positionMillis,
                    duration: status.durationMillis || 1,
                });
    
                // ✅ Quand la chanson est terminée
                if (status.didJustFinish) {
                    if (index < audioFiles.length - 1) {
                        // 🔥 Si ce n'est pas la dernière chanson, jouer la suivante
                        loadAndPlayAudio(index + 1);
                    } else {
                        // 🎵 Si c'est la dernière chanson, arrêter la lecture
                        await newSound.stopAsync();
                        setState((prevState) => ({
                            ...prevState,
                            isPlaying: false,
                        }));
                    }
                }
            }
        });
        const status = await newSound.getStatusAsync();
        const duration = status.isLoaded ? status.durationMillis || 1 : 1;
    
        // ✅ Mettre à jour les notifications avec les métadonnées du morceau
        MusicControl.setNowPlaying({
            title: file.filename, // Titre du morceau
            artist: 'Unknown Artist', 
            artwork: require('@/assets/images/unknown_track.png'), 
            duration: duration, // Durée du morceau
            color: '#79299E'
        });
    
        // ✅ Activer les contrôles de notification
        MusicControl.enableControl('play', true);
        MusicControl.enableControl('pause', true);
        MusicControl.enableControl('nextTrack', index < audioFiles.length - 1); // Suivant uniquement s'il y a une chanson suivante
        MusicControl.enableControl('previousTrack', index > 0); // Précédent uniquement s'il y a une chanson précédente
        MusicControl.enableControl('closeNotification', true, { when: 'paused' })
    
        // ✅ Ajouter des listeners pour les actions de notification
        MusicControl.on(Command.play, () => {
            newSound.playAsync();
        });
    
        MusicControl.on(Command.pause, () => {
            newSound.pauseAsync();
        });
    
        MusicControl.on(Command.nextTrack, () => {
            if (index < audioFiles.length - 1) {
                loadAndPlayAudio(index + 1);
            }
        });
    
        MusicControl.on(Command.previousTrack, () => {
            if (index > 0) {
                loadAndPlayAudio(index - 1);
            }
        });
    
        setSound(newSound);
        setCurrentIndex(index);
        setCurrentTitle(file.filename);
        setIsFirstPlay(false);
    };

    // 🎵 Gérer Play / Pause
    const togglePlayPause = async () => {
        if (!sound) {
            if (isFirstPlay && audioFiles.length > 0) {
                loadAndPlayAudio(0); // ✅ Lire la première chanson si l'utilisateur appuie sur Play sans choisir
            }
            return;
        }

        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
            status.isPlaying
                ? await sound.pauseAsync()
                : await sound.playAsync();
        }
    };

    const stopAudio = async () => {
        if (sound) {
            await sound.stopAsync();
            setState({
                isPlaying: false,
                position: 0,
                duration: state.duration,
            });
        }
    };

    const nextAudio = () => {
        if (currentIndex === null) return;
        const nextIndex = (currentIndex + 1) % audioFiles.length;
        loadAndPlayAudio(nextIndex);
    };

    const previousAudio = () => {
        if (currentIndex === null) return;
        const prevIndex =
            (currentIndex - 1 + audioFiles.length) % audioFiles.length;
        loadAndPlayAudio(prevIndex);
    };

    const seekAudio = async (position: number) => {
        if (sound) {
            await sound.setPositionAsync(position);
        }
    };

    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    return {
        playAudio: loadAndPlayAudio,
        togglePlayPause,
        stopAudio,
        nextAudio,
        previousAudio,
        seekAudio,
        state,
        currentTitle,
        currentIndex,
    };
}
