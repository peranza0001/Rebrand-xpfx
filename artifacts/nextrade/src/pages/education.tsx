import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle, Play } from "lucide-react";
import { Shell } from "@/components/layout/Shell";

interface Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  lessonCount: number;
  createdAt: string;
  completedLessons?: number;
  totalLessons?: number;
  progressPercent?: number;
}

interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  content: string;
  videoUrl?: string;
  duration: number;
  order: number;
  createdAt: string;
  completed?: boolean;
  completedAt?: string;
}

interface LessonDetail extends Lesson {
  navigation?: {
    prevLesson: { id: string; title: string } | null;
    nextLesson: { id: string; title: string } | null;
  };
}

interface EducationStats {
  totalCoursesAvailable: number;
  totalLessonsAvailable: number;
  completedLessons: number;
  completedCourses: number;
  totalTimeSpent: number;
  courseProgress: Array<{
    courseId: string;
    courseTitle: string;
    completed: boolean;
    progress: number;
  }>;
}

const getDifficultyColor = (
  difficulty: "beginner" | "intermediate" | "advanced"
) => {
  switch (difficulty) {
    case "beginner":
      return "bg-green-100 text-green-800";
    case "intermediate":
      return "bg-yellow-100 text-yellow-800";
    case "advanced":
      return "bg-red-100 text-red-800";
  }
};

const getDifficultyLabel = (
  difficulty: "beginner" | "intermediate" | "advanced"
) => {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
};

function EducationCoursesView() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<EducationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useRoute();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, statsRes] = await Promise.all([
          fetch("/api/education/courses"),
          fetch("/api/education/stats"),
        ]);

        if (coursesRes.ok) {
          const data = await coursesRes.json();
          setCourses(data.courses || []);
        }

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Shell>
        <div className="space-y-4 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-gray-100 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Demo Trading Academy</h1>
          <p className="text-gray-600 mt-2">
            Learn Forex trading fundamentals, order types, and risk management strategies
          </p>
        </div>

        {/* Progress Overview */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Courses Completed</p>
                  <p className="text-2xl font-bold">
                    {stats.completedCourses}/{stats.totalCoursesAvailable}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Lessons Completed</p>
                  <p className="text-2xl font-bold">
                    {stats.completedLessons}/{stats.totalLessonsAvailable}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Time</p>
                  <p className="text-2xl font-bold">{stats.totalTimeSpent} min</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Overall Progress</p>
                  <p className="text-2xl font-bold">
                    {stats.totalLessonsAvailable > 0
                      ? Math.round(
                          (stats.completedLessons / stats.totalLessonsAvailable) *
                            100
                        )
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Courses Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Available Courses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <Card
                key={course.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setLocation(`/education/${course.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-3xl">{course.icon}</div>
                    <Badge className={getDifficultyColor(course.difficulty)}>
                      {getDifficultyLabel(course.difficulty)}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{course.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {course.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-semibold">
                        {course.completedLessons}/{course.totalLessons} lessons
                      </span>
                    </div>
                    <Progress
                      value={course.progressPercent || 0}
                      className="h-2"
                    />
                  </div>
                  <Button className="w-full" variant="outline">
                    {course.progressPercent === 100 ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Completed
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        {course.completedLessons === 0
                          ? "Start Course"
                          : "Continue"}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function CourseLessonsView({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useRoute();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/education/courses/${courseId}/lessons`);
        if (res.ok) {
          const data = await res.json();
          setCourse(data.course);
          setLessons(data.lessons || []);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId]);

  if (loading) {
    return (
      <Shell>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6 p-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/education")}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Courses
        </Button>

        {/* Course Header */}
        {course && (
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <span className="text-4xl">{course.icon}</span>
              {course.title}
            </h1>
            <p className="text-gray-600 mt-2">{course.description}</p>
            <Badge className={`mt-4 ${getDifficultyColor(course.difficulty)}`}>
              {getDifficultyLabel(course.difficulty)}
            </Badge>
          </div>
        )}

        {/* Lessons List */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Lessons</h2>
          {lessons.map((lesson, index) => (
            <Card
              key={lesson.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setLocation(`/education/lessons/${lesson.id}`)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full text-sm font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{lesson.title}</p>
                    <p className="text-sm text-gray-600">{lesson.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {lesson.duration} minutes
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {lesson.completed ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <Lock className="w-6 h-6 text-gray-400" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Shell>
  );
}

function LessonDetailView({ lessonId }: { lessonId: string }) {
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [, setLocation] = useRoute();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/education/lessons/${lessonId}`);
        if (res.ok) {
          const data = await res.json();
          setLesson(data.lesson);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [lessonId]);

  const handleCompleteLesson = async () => {
    setCompleting(true);
    try {
      const res = await fetch(`/api/education/lessons/${lessonId}/complete`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setLesson({
          ...lesson!,
          completed: true,
          completedAt: new Date().toISOString(),
        });

        // Optionally auto-navigate to next lesson
        if (data.navigation?.nextLesson) {
          setTimeout(
            () => setLocation(`/education/lessons/${data.navigation.nextLesson.id}`),
            1500
          );
        }
      }
    } catch {
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2" />
            <div className="h-96 bg-gray-100 rounded-lg" />
          </div>
        </div>
      </Shell>
    );
  }

  if (!lesson) {
    return (
      <Shell>
        <div className="p-6">
          <p className="text-gray-600">Lesson not found</p>
          <Button
            onClick={() => setLocation("/education")}
            className="mt-4"
          >
            Back to Education
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6 p-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation(`/education/${lesson.courseId}`)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Course
        </Button>

        {/* Lesson Header */}
        <div>
          <p className="text-sm text-gray-600 mb-2">Lesson {lesson.order}</p>
          <h1 className="text-3xl font-bold tracking-tight">{lesson.title}</h1>
          <p className="text-gray-600 mt-2">{lesson.description}</p>
          <p className="text-sm text-gray-500 mt-2">
            ⏱️ {lesson.duration} minutes
          </p>
        </div>

        {/* Video */}
        {lesson.videoUrl && (
          <Card>
            <CardContent className="p-0">
              <iframe
                src={lesson.videoUrl}
                className="w-full rounded-t-lg"
                style={{ aspectRatio: "16/9" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </CardContent>
          </Card>
        )}

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>Lesson Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-gray-700">
                {lesson.content}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          {!lesson.completed && (
            <Button
              onClick={handleCompleteLesson}
              disabled={completing}
              className="flex-1"
            >
              {completing ? "Marking as complete..." : "Mark as Complete"}
            </Button>
          )}
          {lesson.completed && (
            <div className="flex-1 flex items-center justify-center gap-2 bg-green-50 rounded-lg p-3 border border-green-200">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-700 font-semibold">
                Lesson Completed!
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        {lesson.navigation && (
          <div className="grid grid-cols-2 gap-4">
            {lesson.navigation.prevLesson ? (
              <Button
                variant="outline"
                onClick={() =>
                  setLocation(
                    `/education/lessons/${lesson.navigation!.prevLesson!.id}`
                  )
                }
              >
                ← Previous
              </Button>
            ) : (
              <div />
            )}
            {lesson.navigation.nextLesson ? (
              <Button
                onClick={() =>
                  setLocation(
                    `/education/lessons/${lesson.navigation!.nextLesson!.id}`
                  )
                }
              >
                Next →
              </Button>
            ) : (
              <div />
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}

export function Education() {
  const [, params] = useRoute("/education/:view?/:id?");

  if (!params) {
    return <EducationCoursesView />;
  }

  const { view, id } = params as { view?: string; id?: string };

  if (view === "lessons" && id) {
    return <LessonDetailView lessonId={id} />;
  }

  if (id) {
    return <CourseLessonsView courseId={id} />;
  }

  return <EducationCoursesView />;
}
