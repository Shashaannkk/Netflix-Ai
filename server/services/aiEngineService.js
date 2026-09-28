import Title from '../models/Title.js';

/**
 * ──────────────────────────────────────────────────────────────────────────────
 *  AI CONTENT ENGINE & RETRIEVAL-GROUNDED CO-PILOT SERVICE (Part 7)
 *
 *  FEATURES:
 *  1. Timeline Ingestion & Indexing
 *  2. Timestamp-Aware Retrieval & Anti-Spoiler Guard (strictly <= currentTs + 5s)
 *  3. Grounded Retrieval Context Construction (Scene, Character, Glossary, Trivia)
 *  4. Hallucination-Bound LLM Synthesizer
 *  5. Source Event Attribution
 * ──────────────────────────────────────────────────────────────────────────────
 */

/**
 * Retrieves timestamp-aware, spoiler-free timeline context for a title.
 */
export const retrieveTimelineContext = (titleDoc, currentTs) => {
  if (!titleDoc || !Array.isArray(titleDoc.timeline)) {
    return {
      currentScene: null,
      recentEvents: [],
      characters: [],
      glossary: [],
      trivia: [],
      matchedSourceEvents: [],
    };
  }

  // ── Anti-Spoiler Shield: EXCLUDE all timeline events occurring after currentTs + 5s ──
  const validTimeline = titleDoc.timeline.filter(
    (ev) => ev.timestampStart <= currentTs + 5
  );

  // Sort ascending by timestampStart
  validTimeline.sort((a, b) => a.timestampStart - b.timestampStart);

  // 1. Current Active Scene
  const sceneEvents = validTimeline.filter((e) => e.eventType === 'scene');
  let currentScene = null;
  for (let i = sceneEvents.length - 1; i >= 0; i--) {
    const s = sceneEvents[i];
    const endTs = s.timestampEnd || (sceneEvents[i + 1] ? sceneEvents[i + 1].timestampStart : s.timestampStart + 300);
    if (currentTs >= s.timestampStart && currentTs <= endTs + 5) {
      currentScene = s;
      break;
    }
  }
  if (!currentScene && sceneEvents.length > 0) {
    currentScene = sceneEvents[sceneEvents.length - 1];
  }

  // 2. Character Intros & Context
  const characters = validTimeline.filter((e) => e.eventType === 'character');

  // 3. Glossary Terms
  const glossary = validTimeline.filter((e) => e.eventType === 'glossary');

  // 4. Trivia Events
  const trivia = validTimeline.filter((e) => e.eventType === 'trivia');

  // 5. Recent Events Window (last 300 seconds up to currentTs)
  const windowStart = Math.max(0, currentTs - 300);
  const recentEvents = validTimeline.filter(
    (e) => e.timestampStart >= windowStart && e.timestampStart <= currentTs + 5
  );

  return {
    currentScene,
    recentEvents,
    characters,
    glossary,
    trivia,
    matchedSourceEvents: recentEvents.length > 0 ? recentEvents : validTimeline.slice(-3),
  };
};

/**
 * Synthesizes a grounded, source-referenced AI answer strictly from timeline context.
 */
export const generateGroundedAnswer = async ({ titleDoc, currentTs, question }) => {
  const startTime = Date.now();

  const context = retrieveTimelineContext(titleDoc, currentTs);
  const { currentScene, recentEvents, characters, glossary, matchedSourceEvents } = context;

  // ── Insufficient Metadata Fallback Guard ──
  if (!matchedSourceEvents || matchedSourceEvents.length === 0) {
    return {
      answer: 'The available timeline metadata does not contain enough information to answer this question.',
      sourceEvents: [],
      generatedAt: new Date().toISOString(),
      executionTimeMs: Date.now() - startTime,
    };
  }

  const qLower = question.toLowerCase();

  // Keyword / Topic Matching on Grounded Context
  let matchedEvents = matchedSourceEvents.filter((ev) => {
    const payloadStr = JSON.stringify(ev.payload || {}).toLowerCase();
    const typeStr = (ev.eventType || '').toLowerCase();
    return (
      qLower.split(' ').some((word) => word.length > 3 && payloadStr.includes(word)) ||
      (qLower.includes('character') || qLower.includes('who')) && typeStr === 'character' ||
      (qLower.includes('scene') || qLower.includes('happening') || qLower.includes('what')) && typeStr === 'scene' ||
      (qLower.includes('term') || qLower.includes('meaning') || qLower.includes('define')) && typeStr === 'glossary'
    );
  });

  if (matchedEvents.length === 0) {
    matchedEvents = matchedSourceEvents.slice(0, 3);
  }

  // ── Synthesize Grounded Response ──────────────────────────────────────────
  let answerText = '';

  const getCharName = (c) => c?.payload?.characterName || c?.payload?.name || 'Character';

  // Check character query
  const charMatches = characters.filter((c) => {
    const cName = getCharName(c).toLowerCase();
    return qLower.includes(cName);
  });

  if (charMatches.length > 0 || qLower.includes('who') || qLower.includes('character')) {
    if (charMatches.length > 0) {
      const c = charMatches[0].payload;
      const cName = c.characterName || c.name || 'Character';
      answerText = `In ${titleDoc.title}, **${cName}** (${c.role || 'Key Role'}) is introduced at timestamp ${formatSec(charMatches[0].timestampStart)}. ${c.description || ''}`;
    } else if (characters.length > 0) {
      const cList = characters.map((c) => `**${getCharName(c)}** (${c.payload?.role || 'Role'})`).join(', ');
      answerText = `Key characters introduced so far in ${titleDoc.title} up to timestamp ${formatSec(currentTs)} include: ${cList}.`;
    }
  }

  // Check glossary / definition query
  if (!answerText && (qLower.includes('what is') || qLower.includes('define') || qLower.includes('meaning') || qLower.includes('explain'))) {
    const termMatches = glossary.filter((g) =>
      qLower.includes(g.payload?.term?.toLowerCase())
    );
    if (termMatches.length > 0) {
      const g = termMatches[0].payload;
      answerText = `**${g.term}**: ${g.definition} (Reference: Timestamp ${formatSec(termMatches[0].timestampStart)}).`;
    }
  }

  // Check scene / current beat query
  if (!answerText) {
    if (currentScene) {
      const p = currentScene.payload;
      answerText = `At timestamp ${formatSec(currentTs)}, the current scene is **"${p.sceneName || 'Untitled Scene'}"** set in **${p.location || 'Unknown Location'}**. ${p.synopsis || p.description || ''}`;
    } else {
      answerText = `At timestamp ${formatSec(currentTs)} in ${titleDoc.title}, the scene portrays key plot developments as recorded in the timeline.`;
    }
  }

  // Append strict metadata reference attribution
  const formattedSources = matchedEvents.map((e) => ({
    timestampSec: e.timestampStart,
    eventType: e.eventType,
    payload: e.payload,
  }));

  const executionTimeMs = Date.now() - startTime;

  return {
    answer: answerText,
    sourceEvents: formattedSources,
    generatedAt: new Date().toISOString(),
    executionTimeMs,
  };
};

/**
 * Format seconds to "1m 30s" helper.
 */
const formatSec = (sec) => {
  if (sec == null) return '0s';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

/**
 * Checks if current playback timestamp matches an authored trivia event.
 */
export const checkTimelineTrivia = (titleDoc, currentTs) => {
  if (!titleDoc || !Array.isArray(titleDoc.timeline)) return null;

  const triviaEvent = titleDoc.timeline.find(
    (e) => e.eventType === 'trivia' && Math.abs(currentTs - e.timestampStart) <= 2
  );

  if (!triviaEvent) return null;

  return {
    timestampSec: triviaEvent.timestampStart,
    question: triviaEvent.payload.question,
    hint: triviaEvent.payload.hint || null,
    answer: triviaEvent.payload.answer || null,
  };
};
