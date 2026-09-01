import type { Member, Publication, VideoCategory, Video, News, Activity, SiteSettings, Newsletter, NewsletterItem } from '@/types';
import {
  members as initialMembers,
  publications as initialPublications,
  videoCategories as initialVideoCategories,
  videos as initialVideos,
  news as initialNews,
  activities as initialActivities,
  siteSettings as initialSiteSettings,
} from '@/lib/data';

// ============================================================================
// IN-MEMORY DATABASE - Data persists only during server runtime
// Edit /lib/data.ts to make permanent changes
// ============================================================================

// Mutable copies of data
let members = [...initialMembers];
let publications = [...initialPublications];
let videoCategories = [...initialVideoCategories];
let videos = [...initialVideos];
let news = [...initialNews];
let activities = [...initialActivities];
let siteSettings = [...initialSiteSettings];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const now = () => new Date().toISOString();

// ============================================================================
// MEMBERS CRUD
// ============================================================================

export const getMembers = async (): Promise<Member[]> => {
  return [...members].sort((a, b) => a.order - b.order);
};

export const getMemberById = async (id: string): Promise<Member | undefined> => {
  return members.find(m => m.id === id);
};

export const createMember = async (data: Omit<Member, 'id' | 'created' | 'updated'>): Promise<Member> => {
  const newMember: Member = {
    ...data,
    id: generateId('member'),
    created: now(),
    updated: now(),
  };
  members.push(newMember);
  return newMember;
};

export const updateMember = async (id: string, data: Partial<Member>): Promise<Member> => {
  const index = members.findIndex(m => m.id === id);
  if (index === -1) throw new Error('Member not found');
  
  members[index] = {
    ...members[index],
    ...data,
    updated: now(),
  };
  return members[index];
};

export const deleteMember = async (id: string): Promise<void> => {
  members = members.filter(m => m.id !== id);
};

// ============================================================================
// PUBLICATIONS CRUD
// ============================================================================

export const getPublications = async (): Promise<Publication[]> => {
  return [...publications].sort((a, b) => 
    new Date(b.publication_date).getTime() - new Date(a.publication_date).getTime()
  );
};

export const getPublicationById = async (id: string): Promise<Publication | undefined> => {
  return publications.find(p => p.id === id);
};

export const createPublication = async (data: Omit<Publication, 'id' | 'created' | 'updated'>): Promise<Publication> => {
  const newPub: Publication = {
    ...data,
    id: generateId('pub'),
    created: now(),
    updated: now(),
  };
  publications.push(newPub);
  return newPub;
};

export const updatePublication = async (id: string, data: Partial<Publication>): Promise<Publication> => {
  const index = publications.findIndex(p => p.id === id);
  if (index === -1) throw new Error('Publication not found');
  
  publications[index] = {
    ...publications[index],
    ...data,
    updated: now(),
  };
  return publications[index];
};

export const deletePublication = async (id: string): Promise<void> => {
  publications = publications.filter(p => p.id !== id);
};

// ============================================================================
// VIDEO CATEGORIES CRUD
// ============================================================================

export const getVideoCategories = async (): Promise<VideoCategory[]> => {
  return [...videoCategories]
    .filter(c => c.is_active)
    .sort((a, b) => a.order - b.order);
};

export const getAllVideoCategories = async (): Promise<VideoCategory[]> => {
  return [...videoCategories].sort((a, b) => a.order - b.order);
};

export const getVideoCategoryById = async (id: string): Promise<VideoCategory | undefined> => {
  return videoCategories.find(c => c.id === id);
};

export const createVideoCategory = async (data: Omit<VideoCategory, 'id' | 'created' | 'updated'>): Promise<VideoCategory> => {
  const newCategory: VideoCategory = {
    ...data,
    id: generateId('cat'),
    created: now(),
    updated: now(),
  };
  videoCategories.push(newCategory);
  return newCategory;
};

export const updateVideoCategory = async (id: string, data: Partial<VideoCategory>): Promise<VideoCategory> => {
  const index = videoCategories.findIndex(c => c.id === id);
  if (index === -1) throw new Error('Video category not found');
  
  videoCategories[index] = {
    ...videoCategories[index],
    ...data,
    updated: now(),
  };
  return videoCategories[index];
};

export const deleteVideoCategory = async (id: string): Promise<void> => {
  videoCategories = videoCategories.filter(c => c.id !== id);
};

// ============================================================================
// VIDEOS CRUD
// ============================================================================

export const getVideos = async (categoryId?: string): Promise<(Video & { expand?: { category?: VideoCategory } })[]> => {
  let filtered = [...videos];
  
  if (categoryId) {
    filtered = filtered.filter(v => v.category === categoryId);
  }
  
  return filtered
    .sort((a, b) => a.order - b.order)
    .map(video => ({
      ...video,
      expand: {
        category: videoCategories.find(c => c.id === video.category),
      },
    }));
};

export const getFeaturedVideos = async (): Promise<(Video & { expand?: { category?: VideoCategory } })[]> => {
  return videos
    .filter(v => v.is_featured)
    .sort((a, b) => a.order - b.order)
    .slice(0, 6)
    .map(video => ({
      ...video,
      expand: {
        category: videoCategories.find(c => c.id === video.category),
      },
    }));
};

export const getVideoById = async (id: string): Promise<(Video & { expand?: { category?: VideoCategory } }) | undefined> => {
  const video = videos.find(v => v.id === id);
  if (!video) return undefined;
  
  return {
    ...video,
    expand: {
      category: videoCategories.find(c => c.id === video.category),
    },
  };
};

export const createVideo = async (data: Omit<Video, 'id' | 'created' | 'updated'>): Promise<Video> => {
  const newVideo: Video = {
    ...data,
    id: generateId('video'),
    created: now(),
    updated: now(),
  };
  videos.push(newVideo);
  return newVideo;
};

export const updateVideo = async (id: string, data: Partial<Video>): Promise<Video> => {
  const index = videos.findIndex(v => v.id === id);
  if (index === -1) throw new Error('Video not found');
  
  videos[index] = {
    ...videos[index],
    ...data,
    updated: now(),
  };
  return videos[index];
};

export const deleteVideo = async (id: string): Promise<void> => {
  videos = videos.filter(v => v.id !== id);
};

// ============================================================================
// NEWS CRUD
// ============================================================================

export const getNews = async (): Promise<News[]> => {
  return [...news].sort((a, b) => 
    new Date(b.published_date).getTime() - new Date(a.published_date).getTime()
  );
};

export const getFeaturedNews = async (): Promise<News[]> => {
  return news
    .filter(n => n.is_featured)
    .sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());
};

export const getNewsBySlug = async (slug: string): Promise<News | undefined> => {
  return news.find(n => n.slug === slug);
};

export const getNewsById = async (id: string): Promise<News | undefined> => {
  return news.find(n => n.id === id);
};

export const createNews = async (data: Omit<News, 'id' | 'created' | 'updated'>): Promise<News> => {
  const newNews: News = {
    ...data,
    id: generateId('news'),
    created: now(),
    updated: now(),
  };
  news.push(newNews);
  return newNews;
};

export const updateNews = async (id: string, data: Partial<News>): Promise<News> => {
  const index = news.findIndex(n => n.id === id);
  if (index === -1) throw new Error('News not found');
  
  news[index] = {
    ...news[index],
    ...data,
    updated: now(),
  };
  return news[index];
};

export const deleteNews = async (id: string): Promise<void> => {
  news = news.filter(n => n.id !== id);
};

// ============================================================================
// ACTIVITIES CRUD
// ============================================================================

export const getActivities = async (): Promise<Activity[]> => {
  return [...activities].sort((a, b) => 
    new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  );
};

export const getActivityById = async (id: string): Promise<Activity | undefined> => {
  return activities.find(a => a.id === id);
};

export const createActivity = async (data: Omit<Activity, 'id' | 'created' | 'updated'>): Promise<Activity> => {
  const newActivity: Activity = {
    ...data,
    id: generateId('activity'),
    created: now(),
    updated: now(),
  };
  activities.push(newActivity);
  return newActivity;
};

export const updateActivity = async (id: string, data: Partial<Activity>): Promise<Activity> => {
  const index = activities.findIndex(a => a.id === id);
  if (index === -1) throw new Error('Activity not found');
  
  activities[index] = {
    ...activities[index],
    ...data,
    updated: now(),
  };
  return activities[index];
};

export const deleteActivity = async (id: string): Promise<void> => {
  activities = activities.filter(a => a.id !== id);
};

// ============================================================================
// SITE SETTINGS CRUD
// ============================================================================

export const getSiteSettings = async (): Promise<SiteSettings[]> => {
  return [...siteSettings];
};

export const getSiteSettingByKey = async (key: string): Promise<SiteSettings | undefined> => {
  return siteSettings.find(s => s.key === key);
};

export const createSiteSetting = async (data: Omit<SiteSettings, 'id' | 'created' | 'updated'>): Promise<SiteSettings> => {
  const newSetting: SiteSettings = {
    ...data,
    id: generateId('setting'),
    created: now(),
    updated: now(),
  };
  siteSettings.push(newSetting);
  return newSetting;
};

export const updateSiteSetting = async (id: string, data: Partial<SiteSettings>): Promise<SiteSettings> => {
  const index = siteSettings.findIndex(s => s.id === id);
  if (index === -1) throw new Error('Site setting not found');
  
  siteSettings[index] = {
    ...siteSettings[index],
    ...data,
    updated: now(),
  };
  return siteSettings[index];
};

export const deleteSiteSetting = async (id: string): Promise<void> => {
  siteSettings = siteSettings.filter(s => s.id !== id);
};

// ============================================================================
// NEWSLETTERS
// ============================================================================

export const getNewsletters = async (): Promise<Newsletter[]> => {
  const newsItems: NewsletterItem[] = news.map(n => ({
    id: n.id,
    type: 'news' as const,
    title: n.title,
    date: n.published_date,
    excerpt: n.content.substring(0, 150),
    image: n.featured_image,
  }));

  const activityItems: NewsletterItem[] = activities.map(a => ({
    id: a.id,
    type: 'activity' as const,
    title: a.title,
    date: a.event_date,
    excerpt: a.description?.substring(0, 150),
    image: a.photos && a.photos.length > 0 ? a.photos[0] : undefined,
  }));

  const allItems = [...newsItems, ...activityItems];

  const grouped = new Map<string, NewsletterItem[]>();
  allItems.forEach(item => {
    const [year, month] = item.date.split('-').map(Number);
    const bimesterIndex = Math.floor((month - 1) / 2);
    const key = `${year}-${bimesterIndex}`;

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(item);
  });

  const newsletters: Newsletter[] = Array.from(grouped.entries())
    .map(([key, items]) => {
      const [year, bimesterIndex] = key.split('-').map(Number);
      return {
        id: key,
        year,
        bimesterIndex,
        items: items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      };
    })
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.bimesterIndex - a.bimesterIndex;
    });

  return newsletters;
};

