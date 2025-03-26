const serverButtonsContainer = document.querySelector('.toggle-options');
const episodeListContainer = document.querySelector('.episode-list');
const videoElement = document.getElementById('my-video');

const apiUrlBase = 'https://better-anime.vercel.app';
const proxyUrl = 'https://better-anime-proxy.vercel.app/m3u8-proxy?url=';
const proxyHeaders = '&headers={"referer":"https://megacloud.club"}';

const urlParams = new URLSearchParams(window.location.search);
const currentAnimeId = urlParams.get('id');
const currentSeriesName = urlParams.get('series');
let currentEpisodeId = null;
let currentEpisodeTitle = null;
let currentCategory = localStorage.getItem('preferredCategory') || 'sub';
let autoNextEnabled = true;

let hls = null;

// Function to initialize HLS.js
function initializeHls(videoUrl, startTime = 0) {
    if (hls) {
        hls.destroy();
    }

    hls = new Hls();
    hls.loadSource(videoUrl);
    hls.attachMedia(videoElement);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoElement.currentTime = startTime;
        videoElement.play();
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS.js error:', data);
        alert('Error playing video.');
    });
}

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
    episodeListContainer.innerHTML = '';
    episodes.forEach(episode => {
        const button = document.createElement('button');
        button.textContent = `Episode ${episode.number}: ${episode.title}`;
        button.dataset.url = episode.url;
        button.dataset.episodeId = episode.episodeId;
        button.dataset.episodeTitle = episode.title;
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
    localStorage.setItem('lastWatchedEpisodeId_' + currentAnimeId, episodeId);
    localStorage.setItem('lastWatchedEpisodeTitle_' + currentAnimeId, episodeTitle);
    loadStreamingLinks(episodeId, currentCategory);
}

// Function to fetch and play streaming links
async function loadStreamingLinks(episodeId, category) {
    try {
        const response = await fetch(`${apiUrlBase}/api/v2/hianime/episode/sources?animeEpisodeId=${episodeId}&server=hd-2&category=${category}`);
        const data = await response.json();

        if (data.success && data.data && data.data.sources && data.data.sources.length > 0) {
            const videoUrl = `${proxyUrl}${encodeURIComponent(data.data.sources[0].url)}${proxyHeaders}`;
            const savedTime = loadProgress(episodeId, currentEpisodeTitle);
            initializeHls(videoUrl, savedTime);
        } else {
            alert(`No ${category} streams found for this episode.`);
        }
    } catch (error) {
        console.error('Error fetching streaming links:', error);
        alert(`Error loading ${category} stream.`);
    }
}

// Function to save the watch progress of each episode
function saveProgress(videoUrl, currentTime) {
    if (!currentAnimeId || !currentEpisodeId || !currentEpisodeTitle) {
        return;
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

// Function to toggle Auto Next
function toggleAutoNext() {
    autoNextEnabled = !autoNextEnabled;
    localStorage.setItem('autoNextEnabled', autoNextEnabled);
    updateAutoNextButton();
}

function updateAutoNextButton() {
    const autoNextButton = document.getElementById('autoNextButton');
    if (autoNextButton) {
        autoNextButton.textContent = `Auto Next: ${autoNextEnabled ? 'On' : 'Off'}`;
        autoNextButton.classList.toggle('active', autoNextEnabled);
    }
}

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
videoElement.addEventListener('ended', () => {
    if (autoNextEnabled) {
        playNext();
    }
});

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

// Function to update button styles
function updateButtonStyles(containerClass, activeId) {
    document.querySelectorAll(`.${containerClass} button`).forEach(button => {
        button.classList.remove('active');
    });
    const activeButton = document.getElementById(activeId + 'Button');
    if (activeButton) activeButton.classList.add('active');
}

// Get the anime ID when the page loads
document.addEventListener('DOMContentLoaded', () => {
    if (currentAnimeId) {
        fetchAnimeEpisodes(currentAnimeId).then(() => {
            loadLastWatchedEpisode();
        });
    }
    updateButtonStyles('toggle-options', currentCategory);
    document.getElementById('language-bar').textContent = `Current Language: ${currentCategory === 'sub' ? 'Subbed' : 'Dubbed'}`;
});

// Save progress periodically
videoElement.addEventListener('timeupdate', () => {
    saveProgress(videoElement.src, videoElement.currentTime);
});
