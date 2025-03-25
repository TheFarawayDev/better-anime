const animePlayer = videojs('my-video');
const serverButtonsContainer = document.querySelector('.toggle-options');
const episodeListContainer = document.querySelector('.episode-list');

const apiUrlBase = 'https://better-anime.vercel.app';
const proxyUrl = 'https://better-anime-proxy.vercel.app/m3u8-proxy?url=';
const proxyHeaders = '&headers={"referer":"https://megacloud.club"}';

const urlParams = new URLSearchParams(window.location.search);
const currentAnimeId = urlParams.get('id'); // Pull the anime ID from the URL parameters
const currentSeriesName = urlParams.get('series'); // Get the series name
let currentEpisodeId = null;
let currentEpisodeTitle = null;
let currentCategory = localStorage.getItem('preferredCategory') || 'sub';
let autoNextEnabled = true; // Auto Next is enabled by default

// Function to fetch anime episodes
async function fetchAnimeEpisodes(animeId) {
    try {
        const response = await fetch(`${apiUrlBase}/api/v2/hianime/anime/${animeId}/episodes`);
        const data = await response.json();
        if (data.success && data.data && data.data.episodes) {
            displayEpisodes(data.data.episodes);
        } else {
            alert('Could not load episodes.');
        }
    } catch (error) {
        console.error('Error fetching episodes:', error);
        alert('Error loading episodes.');
    }
}

// Function to display the list of episodes
function displayEpisodes(episodes) {
    episodeListContainer.innerHTML = ''; // Clear existing episodes
    episodes.forEach(episode => {
        const button = document.createElement('button');
        button.textContent = `Episode ${episode.number}: ${episode.title}`;
        button.dataset.url = episode.url; // Add data-url attribute
        button.dataset.episodeId = episode.episodeId; // Add data-episodeId attribute
        button.dataset.episodeTitle = episode.title; // Add data-episodeTitle attribute
        button.addEventListener('click', () => {
            loadEpisodeServers(episode.episodeId, episode.title);
            highlightCurrentEpisode(button);
        });
        episodeListContainer.appendChild(button);
    });
}

// Function to highlight the current episode
function highlightCurrentEpisode(selectedButton) {
    document.querySelectorAll('.episode-list button').forEach(button => button.classList.remove('active'));
    selectedButton.classList.add('active');
}

// Function to load available servers for an episode
async function loadEpisodeServers(episodeId, episodeTitle) {
    currentEpisodeId = episodeId;
    currentEpisodeTitle = episodeTitle;
    localStorage.setItem('lastWatchedEpisodeId_' + currentAnimeId, episodeId); // Save the ID
    localStorage.setItem('lastWatchedEpisodeTitle_' + currentAnimeId, episodeTitle); // Save the title
    loadStreamingLinks(episodeId, currentCategory);
}

// Function to fetch and play streaming links
async function loadStreamingLinks(episodeId, category) {
    try {
        const response = await fetch(`${apiUrlBase}/api/v2/hianime/episode/sources?animeEpisodeId=${episodeId}&server=hd-1&category=${category}`);
        const data = await response.json();

        if (data.success && data.data && data.data.sources && data.data.sources.length > 0) {
            const videoUrl = data.data.sources[0].url;
            const savedTime = loadProgress(episodeId, currentEpisodeTitle);
            playVideo(videoUrl, savedTime);
        } else {
            const responseHd1 = await fetch(`${apiUrlBase}/api/v2/hianime/episode/sources?animeEpisodeId=${episodeId}&server=hd-2&category=${category}`);
            const dataHd2 = await responseHd2.json();
            if (dataHd2.success && dataHd2.data && dataHd2.data.sources && dataHd2.data.sources.length > 0) {
                const videoUrl = dataHd2.data.sources[0].url;
                const savedTime = loadProgress(episodeId, currentEpisodeTitle);
                playVideo(videoUrl, savedTime);
            } else {
                animePlayer.reset();
                animePlayer.src({ type: 'application/x-mpegURL', src: '' });
                alert(`No ${category} streams found for this episode.`);
            }
        }
    } catch (error) {
        console.error('Error fetching streaming links:', error);
        animePlayer.reset();
        animePlayer.src({ type: 'application/x-mpegURL', src: '' });
        alert(`Error loading ${category} stream.`);
    }
}

// Function to save the watch progress of each episode
function saveProgress(videoUrl, currentTime) {
    if (!currentAnimeId || !currentEpisodeId || !currentEpisodeTitle) {
        return; // Don't save if we don't have the necessary info
    }
    const progressKey = `watchProgress_${currentAnimeId}_${currentEpisodeId}_${currentEpisodeTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${currentCategory}`;
    localStorage.setItem(progressKey, currentTime);
}

function loadProgress(episodeId, episodeTitle) {
    if (!currentAnimeId || !episodeId || !episodeTitle) {
        return 0;
    }
    const progressKey = `watchProgress_${currentAnimeId}_${episodeId}_${episodeTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${currentCategory}`;
    const savedTime = localStorage.getItem(progressKey);
    return savedTime ? parseFloat(savedTime) : 0;
}

// Function to auto-load the last watched episode and its progress
function loadLastWatchedEpisode() {
    const lastWatchedEpisodeId = localStorage.getItem('lastWatchedEpisodeId_' + currentAnimeId);
    const lastWatchedEpisodeTitle = localStorage.getItem('lastWatchedEpisodeTitle_' + currentAnimeId);

    if (lastWatchedEpisodeId && lastWatchedEpisodeTitle) {
        const episodeButton = Array.from(document.querySelectorAll('.episode-list button')).find(
            button => button.dataset.episodeId === lastWatchedEpisodeId
        );

        if (episodeButton) {
            highlightCurrentEpisode(episodeButton);
            loadEpisodeServers(lastWatchedEpisodeId, lastWatchedEpisodeTitle);
            loadStreamingLinks(lastWatchedEpisodeId, currentCategory);
        }
    }
}

// Function to play the video with progress
function playVideo(videoUrl, startTime = 0) {
    const introUrl = 'https://raw.githubusercontent.com/TheFarawayDev/better-anime/refs/heads/main/watch/other/BA.mp4';
    animePlayer.reset();
    animePlayer.src({ type: 'video/mp4', src: introUrl });
    animePlayer.ready(() => {
        animePlayer.play();
    });

    animePlayer.on('ended', function onIntroEnded() {
        animePlayer.off('ended', onIntroEnded);
        animePlayer.reset();
        animePlayer.src({ type: 'application/x-mpegURL', src: proxyUrl + videoUrl + proxyHeaders });
        animePlayer.ready(() => {
            animePlayer.currentTime(startTime);
            animePlayer.play();
        });
    });
}

// Function to play the previous episode
function playPrevious() {
    const currentEpisodeButton = document.querySelector('.episode-list button.active');
    if (currentEpisodeButton) {
        const previousButton = currentEpisodeButton.previousElementSibling;
        if (previousButton) {
            previousButton.click();
        } else {
            alert('No previous episode available.');
        }
    } else {
        alert('No episode is currently selected.');
    }
}

function toggleAutoNext() {
    autoNextEnabled = !autoNextEnabled;
    localStorage.setItem('autoNextEnabled', autoNextEnabled); // Save state
    updateAutoNextButton();
}

function updateAutoNextButton() {
    const autoNextButton = document.getElementById('autoNextButton');
    if (autoNextButton) {
        autoNextButton.textContent = `Auto Next: ${autoNextEnabled ? 'On' : 'Off'}`;
        autoNextButton.classList.toggle('active', autoNextEnabled);
    }
}

// Load Auto Next state from localStorage on page load
document.addEventListener('DOMContentLoaded', () => {
    autoNextEnabled = localStorage.getItem('autoNextEnabled') === 'true'; // Convert string to boolean
    updateAutoNextButton();
});

// Function to play the next episode
function playNext() {
    const currentEpisodeButton = document.querySelector('.episode-list button.active');
    if (currentEpisodeButton) {
        const nextButton = currentEpisodeButton.nextElementSibling;
        if (nextButton) {
            nextButton.click();
        } else {
            alert('No next episode available.');
        }
    } else {
        alert('No episode is currently selected.');
    }
}

// Automatically play the next episode when the current one ends (if Auto Next is enabled)
animePlayer.on('ended', () => {
    if (autoNextEnabled) {
        playNext();
    }
});

// Function to save the series ID for the continue watching page
function saveToContinueWatching(id, title, url) {
    let continueWatchingArray = JSON.parse(localStorage.getItem('continueWatching')) || [];
    const existingItemIndex = continueWatchingArray.findIndex(item => item.id === id);
    const pageUrl = window.location.href;

    if (existingItemIndex !== -1) {
        continueWatchingArray[existingItemIndex].url = pageUrl;
    } else {
        continueWatchingArray.push({ id, title, url: pageUrl });
    }

    localStorage.setItem('continueWatching', JSON.stringify(continueWatchingArray));
}

// Function to update button styles
function updateButtonStyles(containerClass, activeId) {
    document.querySelectorAll(`.${containerClass} button`).forEach(button => {
        button.classList.remove('active');
    });
    const activeButton = document.getElementById(activeId + 'Button');
    if (activeButton) activeButton.classList.add('active');
}

// Function to toggle language and highlight button
function toggleLanguage(category) {
    currentCategory = category;
    localStorage.setItem('preferredCategory', currentCategory);
    updateButtonStyles('toggle-options', category);
    document.getElementById('language-bar').textContent = `Current Language: ${category === 'sub' ? 'Subbed' : 'Dubbed'}`;
    if (currentEpisodeId) {
        loadStreamingLinks(currentEpisodeId, currentCategory);
    }
}

// Event listeners for server buttons
serverButtonsContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('server-button')) {
        updateButtonStyles('toggle-options', event.target.dataset.category);
        currentCategory = event.target.dataset.category;
        localStorage.setItem('preferredCategory', currentCategory);
        if (currentEpisodeId) {
            loadStreamingLinks(currentEpisodeId, currentCategory);
        }
    }
});

// Get the anime ID when the page loads
document.addEventListener('DOMContentLoaded', () => {
    if (currentAnimeId) {
        fetchAnimeEpisodes(currentAnimeId).then(() => {
            loadLastWatchedEpisode();
        });
        saveToContinueWatching(currentAnimeId, 'Anime Title', window.location.href);
    }
    updateButtonStyles('toggle-options', currentCategory);
    document.getElementById('language-bar').textContent = `Current Language: ${currentCategory === 'sub' ? 'Subbed' : 'Dubbed'}`;
});