package com.mycompany.myapp.service;

import com.mycompany.myapp.domain.Member;
import com.mycompany.myapp.domain.Plan;
import com.mycompany.myapp.domain.User;
import com.mycompany.myapp.domain.enumeration.MemberStatus;
import com.mycompany.myapp.domain.enumeration.UserStatus;
import com.mycompany.myapp.repository.MemberRepository;
import com.mycompany.myapp.repository.PlanRepository;
import com.mycompany.myapp.service.dto.MemberDtos.ImportLine;
import com.mycompany.myapp.service.dto.MemberDtos.ImportRequest;
import com.mycompany.myapp.service.dto.MemberDtos.ImportResult;
import com.mycompany.myapp.service.dto.MemberDtos.ImportRow;
import com.mycompany.myapp.service.util.Dates;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.*;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Import d'une liste existante (cahier recopié dans Excel, export d'un autre outil) pour démarrer
 * avec les membres actuels. Le navigateur lit le fichier CSV et envoie les lignes ; ici on vérifie
 * (dryRun) puis on importe. Les doublons sont détectés par numéro de téléphone.
 */
@Service
@Transactional
public class MemberImportService {

    private final MemberRepository memberRepository;
    private final PlanRepository planRepository;
    private final SubscriptionService subscriptionService;

    public MemberImportService(MemberRepository memberRepository, PlanRepository planRepository, SubscriptionService subscriptionService) {
        this.memberRepository = memberRepository;
        this.planRepository = planRepository;
        this.subscriptionService = subscriptionService;
    }

    public ImportResult importMembers(ImportRequest request) {
        List<Plan> plans = planRepository.findAll();
        Map<String, Member> existing = new HashMap<>();
        for (Member m : memberRepository.findAllByArchivedFalse(Pageable.unpaged())) {
            existing.put(Dates.phoneKey(m.getUser().getPhone()), m);
        }
        Set<String> seenInFile = new HashSet<>();
        String agent = "import " + MemberViews.currentAgent();
        LocalDate today = Dates.today();

        int ready = 0, duplicates = 0, invalid = 0, imported = 0, updated = 0;
        List<ImportLine> lines = new ArrayList<>();

        for (ImportRow row : request.rows()) {
            String[] names = splitName(row);
            String display = (names[0] + " " + names[1]).trim();
            String phone = row.phone() == null ? "" : row.phone().trim();
            String key = Dates.phoneKey(phone);
            Optional<Plan> plan = matchPlan(row.planName(), plans);
            String planLabel = plan.map(Plan::getName).orElse(row.planName());

            if (phone.isEmpty()) {
                invalid++;
                lines.add(new ImportLine(row.line(), display, "", planLabel, row.endDate(), "MISSING_PHONE", "Téléphone manquant, ligne ignorée"));
                continue;
            }
            if (key.length() < 8 || names[1].isEmpty()) {
                invalid++;
                lines.add(new ImportLine(row.line(), display, phone, planLabel, row.endDate(), "INVALID", key.length() < 8 ? "Numéro incomplet" : "Nom manquant"));
                continue;
            }
            if (!seenInFile.add(key)) {
                duplicates++;
                lines.add(new ImportLine(row.line(), display, phone, planLabel, row.endDate(), "DUPLICATE", "Numéro présent plusieurs fois dans le fichier"));
                continue;
            }

            String note = noteFor(row, plan, today);
            Member current = existing.get(key);
            if (current != null) {
                duplicates++;
                String who = "Doublon : déjà membre (" + MemberViews.fullName(current) + ")";
                if (request.dryRun() || !request.updateExisting()) {
                    lines.add(new ImportLine(row.line(), display, phone, planLabel, row.endDate(), request.dryRun() ? "DUPLICATE" : "SKIPPED", who));
                    continue;
                }
                // Mise à jour : seulement si le fichier donne une fin plus lointaine que celle connue.
                if (plan.isPresent() && row.endDate() != null && (current.getExpiryDate() == null || row.endDate().isAfter(current.getExpiryDate()))) {
                    subscriptionService.addImported(current, plan.get(), row.endDate(), agent);
                }
                updated++;
                lines.add(new ImportLine(row.line(), display, phone, planLabel, row.endDate(), "UPDATED", who + ", mis à jour"));
                continue;
            }

            ready++;
            if (request.dryRun()) {
                lines.add(new ImportLine(row.line(), display, phone, planLabel, row.endDate(), "READY", note));
                continue;
            }
            Member member = createMember(names[0], names[1], phone);
            existing.put(key, member);
            if (plan.isPresent() && row.endDate() != null) {
                subscriptionService.addImported(member, plan.get(), row.endDate(), agent);
            }
            imported++;
            lines.add(new ImportLine(row.line(), display, phone, planLabel, row.endDate(), "IMPORTED", note));
        }
        return new ImportResult(ready, duplicates, invalid, imported, updated, lines);
    }

    private Member createMember(String firstName, String lastName, String phone) {
        User user = new User();
        user.setStatus(UserStatus.CLIENT);
        user.setFirstName(firstName.isEmpty() ? "-" : firstName);
        user.setLastName(lastName);
        user.setPhone(phone);
        user.setPhoneDigits(Dates.digits(phone));
        Member member = new Member();
        member.setUser(user);
        member.setStatus(MemberStatus.ACTIVE);
        member = memberRepository.saveAndFlush(member);
        member.setMemberNumber(String.format("A-%04d", member.getId()));
        return member;
    }

    private static String noteFor(ImportRow row, Optional<Plan> plan, LocalDate today) {
        List<String> notes = new ArrayList<>();
        if (StringUtils.hasText(row.planName()) && plan.isEmpty()) notes.add("formule « " + row.planName() + " » non reconnue : importé sans abonnement");
        else if (plan.isPresent() && !plan.get().getName().equalsIgnoreCase(row.planName().trim())) notes.add("« " + row.planName().trim() + " » lu comme " + plan.get().getName());
        if (plan.isPresent() && row.endDate() == null) notes.add("pas de date de fin : importé sans abonnement");
        if (row.endDate() != null && row.endDate().isBefore(today)) notes.add("sera « expiré »");
        return notes.isEmpty() ? "Prête" : "Prête, " + String.join(", ", notes);
    }

    /**
     * Prénom et nom : colonnes séparées, ou une seule colonne « Nom et prénom ».
     * Dans une seule colonne, les mots en MAJUSCULES sont le nom (« Awa DIALLO ») ; sinon, le dernier mot.
     */
    static String[] splitName(ImportRow row) {
        if (StringUtils.hasText(row.lastName()) || StringUtils.hasText(row.firstName())) {
            return new String[] { capitalize(trim(row.firstName())), capitalize(trim(row.lastName())) };
        }
        String full = trim(row.fullName());
        if (full.isEmpty()) return new String[] { "", "" };
        List<String> words = Arrays.asList(full.split("\\s+"));
        List<String> upper = words.stream().filter(w -> w.length() > 1 && w.equals(w.toUpperCase()) && !w.equals(w.toLowerCase())).toList();
        List<String> first;
        List<String> last;
        if (!upper.isEmpty() && upper.size() < words.size()) {
            last = upper;
            first = words.stream().filter(w -> !upper.contains(w)).toList();
        } else if (words.size() == 1) {
            first = List.of();
            last = words;
        } else {
            first = words.subList(0, words.size() - 1);
            last = List.of(words.get(words.size() - 1));
        }
        return new String[] { capitalize(String.join(" ", first)), capitalize(String.join(" ", last)) };
    }

    /** Rapproche « Mois », « mensuel », « 1 mois »… des formules de la salle. */
    static Optional<Plan> matchPlan(String raw, List<Plan> plans) {
        if (!StringUtils.hasText(raw)) return Optional.empty();
        String n = normalize(raw);
        Optional<Plan> exact = plans.stream().filter(p -> normalize(p.getName()).equals(n)).findFirst();
        if (exact.isPresent()) return exact;
        String target;
        if (n.contains("seance") || n.contains("jour")) target = "seance";
        else if (n.contains("semaine") || n.contains("hebdo")) target = "semaine";
        else if (n.contains("trim") || n.contains("3 mois")) target = "trimestriel";
        else if (n.contains("semest") || n.contains("6 mois")) target = "semestriel";
        else if (n.contains("an") || n.contains("12 mois")) target = "annuel";
        else if (n.contains("mois") || n.contains("mens")) target = "mensuel";
        else return Optional.empty();
        return plans.stream().filter(p -> normalize(p.getName()).startsWith(target)).findFirst();
    }

    private static String normalize(String s) {
        return Normalizer.normalize(s.trim().toLowerCase(Locale.FRENCH), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    }

    private static String trim(String s) {
        return s == null ? "" : s.trim();
    }

    /** « DIALLO » → « Diallo », « jean-marc » → « Jean-Marc ». */
    private static String capitalize(String s) {
        if (s.isEmpty()) return s;
        StringBuilder out = new StringBuilder();
        boolean start = true;
        for (char c : s.toLowerCase(Locale.FRENCH).toCharArray()) {
            out.append(start ? Character.toUpperCase(c) : c);
            start = c == ' ' || c == '-' || c == '\'';
        }
        return out.toString();
    }
}
