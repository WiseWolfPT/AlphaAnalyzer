import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Newspaper, ExternalLink, Calendar } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

interface NewsArticle {
  title: string;
  text: string;
  url: string;
  publishedDate: string;
  site: string;
  image?: string;
}

interface StockNewsFeedProps {
  articles: NewsArticle[];
  isLoading?: boolean;
}

export function StockNewsFeed({ articles, isLoading }: StockNewsFeedProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-teya-green" />
            Latest News
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-secondary rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-secondary rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-teya-green" />
            Latest News
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No recent news available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-teya-green" />
          Latest News
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {articles.map((article, index) => (
          <div
            key={index}
            className="border-b last:border-0 pb-4 last:pb-0 hover:bg-secondary/20 transition-colors rounded-lg p-2 -m-2"
          >
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-medium text-sm line-clamp-2 flex-1">
                  {article.title}
                </h4>
                <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
              
              {article.text && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {article.text}
                </p>
              )}
              
              <div className="flex items-center gap-3 text-xs">
                <Badge variant="secondary" className="text-xs">
                  {article.site}
                </Badge>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatDistanceToNow(new Date(article.publishedDate), { addSuffix: true })}
                </span>
              </div>
            </a>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}