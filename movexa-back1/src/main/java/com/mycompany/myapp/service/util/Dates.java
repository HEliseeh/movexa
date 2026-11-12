package com.mycompany.myapp.service.util;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * Dates « métier » : la salle vit à l'heure du Bénin (UTC+1), quel que soit le fuseau du serveur.
 * « Aujourd'hui » doit donc toujours être calculé dans ce fuseau.
 */
public final class Dates {

    public static final ZoneId ZONE = ZoneId.of("Africa/Porto-Novo");

    private Dates() {}

    public static LocalDate today() {
        return LocalDate.now(ZONE);
    }

    /** Début de journée (00:00 au Bénin) sous forme d'instant UTC, pour filtrer les colonnes timestamp. */
    public static Instant startOf(LocalDate day) {
        return day.atStartOfDay(ZONE).toInstant();
    }

    /** Début du lendemain : borne exclusive d'une journée. */
    public static Instant endOf(LocalDate day) {
        return startOf(day.plusDays(1));
    }

    public static LocalDate dayOf(Instant instant) {
        return instant.atZone(ZONE).toLocalDate();
    }

    /** Uniquement les chiffres d'un numéro de téléphone. */
    public static String digits(String value) {
        return value == null ? "" : value.replaceAll("\\D", "");
    }

    /**
     * Clé de comparaison d'un téléphone : les 8 derniers chiffres.
     * « 97 41 22 08 », « +229 97412208 » et « +229 01 97 41 22 08 » sont le même numéro.
     */
    public static String phoneKey(String value) {
        String d = digits(value);
        return d.length() > 8 ? d.substring(d.length() - 8) : d;
    }
}
