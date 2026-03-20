import { Document, Link, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ResumePdfData } from "@/lib/resumePdfData";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 50,
    color: "#1a1a1a",
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#2d2d2d",
    paddingBottom: 8,
  },
  name: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  contact: {
    fontSize: 9,
    color: "#555",
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#cccccc",
    paddingBottom: 2,
    marginBottom: 6,
  },
  jobTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  jobMeta: {
    fontSize: 9,
    color: "#666",
    marginBottom: 3,
  },
  bullet: {
    flexDirection: "row",
    marginBottom: 2,
    paddingLeft: 8,
  },
  bulletDot: {
    width: 10,
    fontSize: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.4,
  },
  projectTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  skillRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  skillLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    width: 140,
  },
  skillValue: {
    flex: 1,
    fontSize: 10,
  },
  link: {
    flex: 1,
    fontSize: 10,
    color: "#1a4d8f",
    textDecoration: "underline",
  },
  linkPlaceholder: {
    fontSize: 10,
    color: "#888",
  },
});

function BulletPoint({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

function joinBar(parts: (string | undefined)[]) {
  return parts.filter((p) => p && String(p).trim()).join(" | ");
}

function hrefForLink(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

type Props = { data: ResumePdfData };

export function ResumePDF({ data }: Props) {
  const contactLine = joinBar([data.location, data.email, data.phone]);
  const hasEducation =
    Boolean(data.education?.degree?.trim()) ||
    Boolean(data.education?.school?.trim());

  return (
    <Document>
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.header}>
          <Text style={styles.name}>{data.name || " "}</Text>
          {contactLine ? (
            <Text style={styles.contact}>{contactLine}</Text>
          ) : null}
        </View>

        {data.summary?.trim() ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Summary</Text>
            <Text style={{ fontSize: 10, lineHeight: 1.4 }}>{data.summary}</Text>
          </View>
        ) : null}

        {data.skills.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Skills</Text>
            {data.skills.map((skillGroup, i) => (
              <View key={i} style={styles.skillRow} wrap={false}>
                <Text style={styles.skillLabel}>{skillGroup.category}:</Text>
                <Text style={styles.skillValue}>
                  {skillGroup.items.join(", ")}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {data.projects.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Projects</Text>
            {data.projects.map((project, i) => (
              <View key={i} style={{ marginBottom: 6 }} wrap={false}>
                <Text style={styles.projectTitle}>
                  {joinBar([project.name, project.location, project.date])}
                </Text>
                {project.bullets.map((b, j) => (
                  <BulletPoint key={j} text={b} />
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {data.experience.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Professional Experience</Text>
            {data.experience.map((job, i) => (
              <View key={i} style={{ marginBottom: 8 }} wrap={false}>
                <Text style={styles.jobTitle}>
                  {joinBar([job.title, job.company])}
                </Text>
                <Text style={styles.jobMeta}>
                  {joinBar([job.location, job.dates])}
                </Text>
                {job.bullets.map((b, j) => (
                  <BulletPoint key={j} text={b} />
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {hasEducation ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Education</Text>
            {data.education.degree ? (
              <Text style={styles.jobTitle}>{data.education.degree}</Text>
            ) : null}
            <Text style={styles.jobMeta}>
              {joinBar([data.education.school, data.education.dates])}
            </Text>
            {data.education.coursework?.trim() ? (
              <Text style={{ fontSize: 9, color: "#555", marginTop: 2 }}>
                Relevant Coursework: {data.education.coursework}
              </Text>
            ) : null}
          </View>
        ) : null}

        {data.certifications.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Certifications</Text>
            {data.certifications.map((cert, i) => (
              <BulletPoint key={i} text={cert} />
            ))}
          </View>
        ) : null}

        {data.extracurriculars.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Extra-Curricular Activities</Text>
            {data.extracurriculars.map((item, i) => (
              <Text key={i} style={{ fontSize: 10, marginBottom: 2 }}>
                {item}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Links</Text>
          <View style={styles.skillRow} wrap={false}>
            <Text style={styles.skillLabel}>LinkedIn:</Text>
            {data.linkedin.trim() ? (
              <Link src={hrefForLink(data.linkedin)} style={styles.link}>
                {data.linkedin.trim()}
              </Link>
            ) : (
              <Text style={[styles.skillValue, styles.linkPlaceholder]}>—</Text>
            )}
          </View>
          <View style={styles.skillRow} wrap={false}>
            <Text style={styles.skillLabel}>GitHub:</Text>
            {data.github.trim() ? (
              <Link src={hrefForLink(data.github)} style={styles.link}>
                {data.github.trim()}
              </Link>
            ) : (
              <Text style={[styles.skillValue, styles.linkPlaceholder]}>—</Text>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}
