package com.mycompany.myapp.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.io.Serializable;
import lombok.Getter;
import lombok.Setter;

/**
 * Paramètres de la salle. Une seule ligne (id = 1) tant que le multi-salles n'est pas en place :
 * il faudra alors une ligne par salle (tenant).
 * Entité « plate » sans relation : exposée telle quelle par l'API.
 */
@Getter
@Setter
@Entity
@Table(name = "gym_settings")
public class GymSettings implements Serializable {

    private static final long serialVersionUID = 1L;
    public static final long SINGLE_ID = 1L;

    @Id
    private Long id;

    // ---- Ma salle ----
    @Size(max = 150)
    @Column(name = "name")
    private String name;

    @Size(max = 30)
    @Column(name = "phone")
    private String phone;

    @Size(max = 200)
    @Column(name = "address")
    private String address;

    @Size(max = 100)
    @Column(name = "opening_hours")
    private String openingHours;

    @Size(max = 30)
    @Column(name = "momo_number")
    private String momoNumber;

    @Size(max = 30)
    @Column(name = "moov_number")
    private String moovNumber;

    @Size(max = 300)
    @Column(name = "receipt_footer")
    private String receiptFooter;

    /** « Expire bientôt » = N jours ou moins avant la fin. */
    @NotNull
    @Min(1)
    @Max(60)
    @Column(name = "expiring_soon_days", nullable = false)
    private Integer expiringSoonDays = 7;

    // ---- Paiements ----
    @Column(name = "cash_enabled", nullable = false)
    private boolean cashEnabled = true;

    @Column(name = "mtn_enabled", nullable = false)
    private boolean mtnEnabled = true;

    @Column(name = "moov_enabled", nullable = false)
    private boolean moovEnabled = true;

    /** KKIAPAY ou FEDAPAY */
    @Size(max = 20)
    @Column(name = "aggregator")
    private String aggregator;

    /** Vide tant que le compte marchand n'est pas ouvert : le paiement par lien est alors désactivé. */
    @Size(max = 200)
    @Column(name = "payment_link_base_url")
    private String paymentLinkBaseUrl;

    // ---- Relances des membres : canaux par règle ----
    @Column(name = "reminder_before7_sms", nullable = false)
    private boolean reminderBefore7Sms;

    @Column(name = "reminder_before7_whatsapp", nullable = false)
    private boolean reminderBefore7Whatsapp;

    @Column(name = "reminder_before1_sms", nullable = false)
    private boolean reminderBefore1Sms;

    @Column(name = "reminder_before1_whatsapp", nullable = false)
    private boolean reminderBefore1Whatsapp;

    @Column(name = "reminder_after1_sms", nullable = false)
    private boolean reminderAfter1Sms;

    @Column(name = "reminder_after1_whatsapp", nullable = false)
    private boolean reminderAfter1Whatsapp;

    @Column(name = "reminder_after7_sms", nullable = false)
    private boolean reminderAfter7Sms;

    @Column(name = "reminder_after7_whatsapp", nullable = false)
    private boolean reminderAfter7Whatsapp;

    // ---- Prospects : chance initiale par source, points gagnés et baisse ----
    @NotNull
    @Min(0)
    @Max(100)
    @Column(name = "score_walk_in", nullable = false)
    private Integer scoreWalkIn = 50;

    @NotNull
    @Min(0)
    @Max(100)
    @Column(name = "score_referral", nullable = false)
    private Integer scoreReferral = 60;

    @NotNull
    @Min(0)
    @Max(100)
    @Column(name = "score_word_of_mouth", nullable = false)
    private Integer scoreWordOfMouth = 40;

    @NotNull
    @Min(0)
    @Max(100)
    @Column(name = "score_social", nullable = false)
    private Integer scoreSocial = 30;

    @NotNull
    @Min(0)
    @Max(100)
    @Column(name = "score_flyer", nullable = false)
    private Integer scoreFlyer = 20;

    @NotNull
    @Min(0)
    @Max(100)
    @Column(name = "score_other", nullable = false)
    private Integer scoreOther = 30;

    @NotNull
    @Min(0)
    @Max(100)
    @Column(name = "points_reply", nullable = false)
    private Integer pointsReply = 15;

    @NotNull
    @Min(0)
    @Max(100)
    @Column(name = "points_visit", nullable = false)
    private Integer pointsVisit = 20;

    @NotNull
    @Min(0)
    @Max(100)
    @Column(name = "points_trial", nullable = false)
    private Integer pointsTrial = 25;

    @NotNull
    @Min(0)
    @Max(60)
    @Column(name = "grace_days", nullable = false)
    private Integer graceDays = 3;

    @NotNull
    @Min(0)
    @Max(100)
    @Column(name = "decay_per_day", nullable = false)
    private Integer decayPerDay = 3;

    @NotNull
    @Min(0)
    @Max(100)
    @Column(name = "alert_threshold", nullable = false)
    private Integer alertThreshold = 10;
}
