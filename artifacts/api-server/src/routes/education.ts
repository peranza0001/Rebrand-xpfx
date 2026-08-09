import { Router, type IRouter } from "express";
import {
  getDemoCourses,
  getDemoLessons,
  getUserData,
  logActivity,
  NOW,
} from "../lib/store";
import { requireAuth } from "../lib/session";
import { notifyUser, pushAdminAlert } from "../lib/notify";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/education/courses/:courseId", requireAuth, (req, res) => {
  try {
    const { courseId } = req.params;
    const data = getUserData(req.userId!);
    const courses = getDemoCourses();
    const lessons = getDemoLessons();

    const course = courses.find((c) => c.id === courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const courseLessons = lessons
      .filter((l) => l.courseId === courseId)
      .sort((a, b) => a.order - b.order)
      .map((lesson) => {
        const progress = data.lessonProgress.get(lesson.id);
        return {
          ...lesson,
          completed: progress?.completed ?? false,
          completedAt: progress?.completedAt,
        };
      });

    return res.json({
      success: true,
      course,
      lessons: courseLessons,
    });
  } catch (error) {
    logger.error({ err: error }, "[education] GET /courses/:courseId error");
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve course lessons.",
    });
  }
});

router.get("/education/progress", requireAuth, (req, res) => {
  try {
    const data = getUserData(req.userId!);
    const courses = getDemoCourses();
    const lessons = getDemoLessons();

    return res.json({
      success: true,
      progress: {
        totalCoursesAvailable: courses.length,
        totalLessonsAvailable: lessons.length,
        completedLessons: Array.from(data.lessonProgress.values()).filter(
          (p) => p.completed,
        ).length,
        completedCourses: courses.filter((course) => {
          const courseLessons = lessons.filter((l) => l.courseId === course.id);
          return courseLessons.every((l) => {
            const p = data.lessonProgress.get(l.id);
            return p?.completed;
          });
        }).length,
        totalTimeSpent: lessons.reduce((acc, lesson) => {
          const progress = data.lessonProgress.get(lesson.id);
          return progress?.completed ? acc + lesson.duration : acc;
        }, 0),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[education] GET /progress error");
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve progress.",
    });
  }
});

/**
 * GET /education/courses
 * Returns all available demo trading courses with user progress
 */
router.get("/education/courses", requireAuth, (req, res) => {
  try {
    const data = getUserData(req.userId!);
    const courses = getDemoCourses();

    const coursesWithProgress = courses.map((course) => {
      const courseLessons = getDemoLessons().filter(
        (l) => l.courseId === course.id,
      );
      const completedCount = courseLessons.filter((l) => {
        const progress = data.lessonProgress.get(l.id);
        return progress?.completed;
      }).length;

      return {
        ...course,
        completedLessons: completedCount,
        totalLessons: courseLessons.length,
        progressPercent: Math.round(
          (completedCount / courseLessons.length) * 100,
        ),
      };
    });

    return res.json({
      success: true,
      courses: coursesWithProgress,
    });
  } catch (error) {
    logger.error({ err: error }, "[education] GET /courses error");
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve courses.",
    });
  }
});

/**
 * GET /education/courses/:courseId/lessons
 * Returns all lessons for a specific course with user progress
 */
router.get("/education/courses/:courseId/lessons", requireAuth, (req, res) => {
  try {
    const { courseId } = req.params;
    const data = getUserData(req.userId!);
    const courses = getDemoCourses();
    const lessons = getDemoLessons();

    const course = courses.find((c) => c.id === courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const courseLessons = lessons
      .filter((l) => l.courseId === courseId)
      .sort((a, b) => a.order - b.order)
      .map((lesson) => {
        const progress = data.lessonProgress.get(lesson.id);
        return {
          ...lesson,
          completed: progress?.completed ?? false,
          completedAt: progress?.completedAt,
        };
      });

    return res.json({
      success: true,
      course,
      lessons: courseLessons,
    });
  } catch (error) {
    logger.error({ err: error }, "[education] GET /courses/:courseId/lessons error");
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve course lessons.",
    });
  }
});

/**
 * GET /education/lessons/:lessonId
 * Returns detailed lesson content with user progress
 */
router.get("/education/lessons/:lessonId", requireAuth, (req, res) => {
  try {
    const { lessonId } = req.params;
    const data = getUserData(req.userId!);
    const lessons = getDemoLessons();

    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found.",
      });
    }

    const progress = data.lessonProgress.get(lessonId);
    const allCourseLessons = lessons
      .filter((l) => l.courseId === lesson.courseId)
      .sort((a, b) => a.order - b.order);
    const currentIndex = allCourseLessons.findIndex((l) => l.id === lessonId);
    const nextLesson = allCourseLessons[currentIndex + 1] ?? null;
    const prevLesson = allCourseLessons[currentIndex - 1] ?? null;

    return res.json({
      success: true,
      lesson: {
        ...lesson,
        completed: progress?.completed ?? false,
        completedAt: progress?.completedAt,
      },
      navigation: {
        prevLesson: prevLesson ? { id: prevLesson.id, title: prevLesson.title } : null,
        nextLesson: nextLesson ? { id: nextLesson.id, title: nextLesson.title } : null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[education] GET /lessons/:lessonId error");
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve lesson.",
    });
  }
});

/**
 * POST /education/lessons/:lessonId/complete
 * Marks a lesson as completed and updates user progress
 */
router.post("/education/lessons/:lessonId/complete", requireAuth, (req, res) => {
  try {
    const { lessonId } = req.params;
    const data = getUserData(req.userId!);
    const lessons = getDemoLessons();

    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found.",
      });
    }

    const existingProgress = data.lessonProgress.get(lessonId);
    if (existingProgress?.completed) {
      return res.json({
        success: true,
        message: "Lesson already completed.",
        progress: existingProgress,
      });
    }

    // Mark lesson as complete
    const completedAt = NOW();
    data.lessonProgress.set(lessonId, {
      lessonId,
      completed: true,
      completedAt,
    });

    // Log activity
    logActivity({
      actorId: req.userId!,
      action: "lesson_completed",
      detail: `Completed lesson ${lesson.title} for course ${lesson.courseId}. Duration: ${lesson.duration} minutes.`,
    });

    // Check if entire course is completed
    const courseLessons = lessons.filter((l) => l.courseId === lesson.courseId);
    const allCompleted = courseLessons.every((l) => {
      const p = data.lessonProgress.get(l.id);
      return p?.completed;
    });

    if (allCompleted) {
      logActivity({
        actorId: req.userId!,
        action: "course_completed",
        detail: `Completed entire course ${lesson.courseId}.`,
      });

      // Notify user of course completion (optional reward)
      notifyUser({
        userId: req.userId!,
        kind: "success",
        title: "Course Completed! 🎓",
        body: "You've successfully completed the entire course. Great progress!",
      });

      pushAdminAlert({
        kind: "course.completed",
        severity: "info",
        title: "Course Completed",
        body: `User completed course: ${lesson.courseId}`,
        userId: req.userId,
      });
    }

    return res.json({
      success: true,
      message: "Lesson marked as complete.",
      progress: data.lessonProgress.get(lessonId),
      courseCompleted: allCompleted,
    });
  } catch (error) {
    logger.error({ err: error }, "[education] POST /lessons/:lessonId/complete error");
    return res.status(500).json({
      success: false,
      message: "Failed to complete lesson.",
    });
  }
});

/**
 * GET /education/stats
 * Returns user's education progress statistics
 */
router.get("/education/progress", requireAuth, (req, res) => {
  try {
    const data = getUserData(req.userId!);
    const courses = getDemoCourses();
    const lessons = getDemoLessons();

    const progress = courses.map((course) => {
      const courseLessons = lessons.filter((l) => l.courseId === course.id);
      const completedCount = courseLessons.filter((l) => {
        const p = data.lessonProgress.get(l.id);
        return p?.completed;
      }).length;

      return {
        courseId: course.id,
        title: course.title,
        completedLessons: completedCount,
        totalLessons: courseLessons.length,
        progressPercent: Math.round((completedCount / courseLessons.length) * 100),
      };
    });

    return res.json({
      success: true,
      progress,
      completedLessons: Array.from(data.lessonProgress.values()).filter((p) => p.completed).length,
    });
  } catch (error) {
    logger.error({ err: error }, "[education] GET /progress error");
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve education progress.",
    });
  }
});

router.get("/education/stats", requireAuth, (req, res) => {
  try {
    const data = getUserData(req.userId!);
    const courses = getDemoCourses();
    const lessons = getDemoLessons();

    const stats = {
      totalCoursesAvailable: courses.length,
      totalLessonsAvailable: lessons.length,
      completedLessons: Array.from(data.lessonProgress.values()).filter(
        (p) => p.completed,
      ).length,
      completedCourses: courses.filter((course) => {
        const courseLessons = lessons.filter((l) => l.courseId === course.id);
        return courseLessons.every((l) => {
          const p = data.lessonProgress.get(l.id);
          return p?.completed;
        });
      }).length,
      totalTimeSpent: lessons.reduce((acc, lesson) => {
        const progress = data.lessonProgress.get(lesson.id);
        return progress?.completed ? acc + lesson.duration : acc;
      }, 0),
      courseProgress: courses.map((course) => {
        const courseLessons = lessons.filter((l) => l.courseId === course.id);
        const completedCount = courseLessons.filter((l) => {
          const p = data.lessonProgress.get(l.id);
          return p?.completed;
        }).length;
        return {
          courseId: course.id,
          courseTitle: course.title,
          completed: completedCount === courseLessons.length,
          progress: Math.round((completedCount / courseLessons.length) * 100),
        };
      }),
    };

    return res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error({ err: error }, "[education] GET /stats error");
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve education statistics.",
    });
  }
});

export default router;
